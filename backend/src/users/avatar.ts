import { BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';

const logger = new Logger('AvatarStorage');

/**
 * Liste canonique des 8 avatars prédéfinis. Le `value` envoyé par le front
 * pour un preset doit correspondre exactement à l'un de ces noms.
 */
export const PRESET_AVATARS = [
  'pig-green',
  'lion',
  'elephant',
  'fox',
  'owl',
  'bee',
  'turtle',
  'squirrel',
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Filesystem fallback (dev local sans Cloudinary configuré).
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');

// Si CLOUDINARY_URL est défini, on l'utilise. Sinon fallback filesystem.
// Format CLOUDINARY_URL : `cloudinary://<api_key>:<api_secret>@<cloud_name>`
// Le SDK le lit automatiquement depuis process.env au premier appel.
const useCloudinary = !!process.env.CLOUDINARY_URL;

if (useCloudinary) {
  // Force secure=true (URLs https) — important pour le mixed content.
  cloudinary.config({ secure: true });
  logger.log('Cloudinary configuré pour le storage des avatars uploadés.');
} else {
  logger.warn(
    'CLOUDINARY_URL absent — fallback filesystem local (OK en dev, PAS en prod).',
  );
}

export function isPresetAvatar(value: string): value is PresetAvatar {
  return (PRESET_AVATARS as readonly string[]).includes(value);
}

interface ParsedDataUrl {
  mime: string;
  buffer: Buffer;
}

/**
 * Parse un data URL (`data:image/png;base64,iVBORw0KG...`) et retourne
 * le buffer décodé + le MIME type. Lève BadRequestException si format invalide,
 * mime non supporté, ou taille > 2MB.
 */
export function parseDataUrl(input: string): ParsedDataUrl {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(input.trim());
  if (!match) {
    throw new BadRequestException(
      'Format invalide — attendu une data URL base64 (data:image/...;base64,...)',
    );
  }
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    throw new BadRequestException(
      `Format non supporté : ${mime}. Utilise JPG, PNG ou WEBP.`,
    );
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength > MAX_BYTES) {
    throw new BadRequestException(
      `Image trop lourde (${(buffer.byteLength / 1_048_576).toFixed(1)} MB). Max 2 MB.`,
    );
  }
  return { mime, buffer };
}

/**
 * Redimensionne en 256×256 (cover/center) et stocke l'image.
 *
 * - Si Cloudinary configuré → upload vers Cloudinary, retourne le `public_id`
 *   (ex: "sousou/avatars/<userId>"). Le front reconstruit l'URL via
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.
 * - Sinon → écrit en local sous `uploads/avatars/{userId}.jpg`, retourne le
 *   filename.
 *
 * Dans les deux cas, la valeur retournée est stockée sous la forme
 * "upload:{value}" dans User.avatarUrl.
 */
export async function saveUploadedAvatar(
  userId: string,
  buffer: Buffer,
): Promise<string> {
  // Pipeline image identique dans les deux modes : 256×256 JPEG mozjpeg q=85.
  // On normalise tout en JPEG pour garder un identifiant unique par user et
  // éviter qu'un upload .png + un upload .webp coexistent en orphelins.
  const processed = await sharp(buffer)
    .rotate()
    .resize(256, 256, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  if (useCloudinary) {
    return uploadToCloudinary(userId, processed);
  }
  return saveToFilesystem(userId, processed);
}

async function saveToFilesystem(
  userId: string,
  processed: Buffer,
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${userId}.jpg`;
  const filepath = join(UPLOAD_DIR, filename);
  await sharp(processed).toFile(filepath);
  return filename;
}

/**
 * Upload sur Cloudinary via le `upload_stream` (qui accepte un Buffer).
 * On utilise un `public_id` déterministe (sousou/avatars/{userId}) avec
 * `overwrite: true` pour qu'un nouvel upload remplace l'ancien automatiquement
 * — pas besoin de cleanup explicite côté users.service.
 */
function uploadToCloudinary(userId: string, processed: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        public_id: `sousou/avatars/${userId}`,
        overwrite: true,
        resource_type: 'image',
        // Pas besoin de transformation côté Cloudinary, l'image est déjà
        // optimisée à 256×256 par sharp en amont.
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result?.public_id) {
          return reject(new Error('Cloudinary : public_id manquant.'));
        }
        resolve(result.public_id);
      },
    );
    upload.end(processed);
  });
}

/**
 * Best-effort : supprime un éventuel ancien upload pour cet user.
 * - Cloudinary : `destroy(public_id)`.
 * - Filesystem : `unlink`.
 * Silencieux si pas de ressource (typique 1ère mise à jour).
 */
export async function removeUploadedAvatar(value: string): Promise<void> {
  if (!value) return;
  if (useCloudinary) {
    try {
      await cloudinary.uploader.destroy(value, { resource_type: 'image' });
    } catch (err) {
      logger.warn(
        `Cloudinary destroy(${value}) a échoué : ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return;
  }
  try {
    await unlink(join(UPLOAD_DIR, value));
  } catch {
    // ENOENT, EACCES, etc. — on ignore pour ne pas bloquer un PATCH si le
    // fichier orphelin a déjà disparu.
  }
}

/**
 * Extrait la valeur d'un avatarUrl "upload:..." (ou null).
 *
 * - Mode Cloudinary : retourne le `public_id` (ex: "sousou/avatars/u123").
 * - Mode filesystem : retourne le filename (ex: "u123.jpg").
 *
 * À passer à `removeUploadedAvatar` pour cleanup.
 */
export function getUploadFilename(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (!avatarUrl.startsWith('upload:')) return null;
  return avatarUrl.slice('upload:'.length);
}
