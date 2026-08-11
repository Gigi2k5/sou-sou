import { BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'node:crypto';

import sharp from 'sharp';

const logger = new Logger('ArticleCoverStorage');

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface ParsedDataUrl {
  mime: string;
  buffer: Buffer;
}

/**
 * Parse un data URL base64 en Buffer + mime.
 * Rejette les formats non supportés et les fichiers > 5 MB (source).
 */
function parseDataUrl(input: string): ParsedDataUrl {
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
      `Image trop lourde (${(buffer.byteLength / 1_048_576).toFixed(1)} MB). Max 5 MB.`,
    );
  }
  return { mime, buffer };
}

/**
 * Upload une image de couverture d'article sur Cloudinary.
 *
 * - Redimensionne à 1600px de large max (aspect ratio préservé).
 * - Compresse en JPEG q=82 (mozjpeg) pour un poids raisonnable en front.
 * - Public ID aléatoire pour éviter les collisions entre articles d'un même
 *   auteur (contrairement aux avatars qui utilisent un ID déterministe).
 *
 * Retourne l'URL publique HTTPS de l'image uploadée — c'est cette URL qui est
 * ensuite stockée dans `Article.coverImage`.
 */
export async function uploadArticleCover(
  authorId: string,
  dataUrl: string,
): Promise<string> {
  if (!process.env.CLOUDINARY_URL) {
    throw new BadRequestException(
      'Upload d\'image indisponible — Cloudinary n\'est pas configuré.',
    );
  }

  const { buffer } = parseDataUrl(dataUrl);

  const processed = await sharp(buffer)
    .rotate()
    .resize(1600, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  // Force secure=true au premier appel (idempotent).
  cloudinary.config({ secure: true });

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        public_id: `sousou/articles/covers/${authorId}-${randomBytes(8).toString('hex')}`,
        resource_type: 'image',
      },
      (err, result) => {
        if (err) {
          logger.error(`Upload cover échoué pour ${authorId} : ${err.message}`);
          return reject(err);
        }
        if (!result?.secure_url) {
          return reject(new Error('Cloudinary : secure_url manquant.'));
        }
        resolve(result.secure_url);
      },
    );
    upload.end(processed);
  });
}
