import { Logger } from '@nestjs/common';

const logger = new Logger('YouTube');

/**
 * Extrait le video ID depuis une URL YouTube. Supporte :
 *  - https://www.youtube.com/watch?v=ID&t=12s
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 *  - https://m.youtube.com/...
 *
 * Retourne `null` si l'URL n'est pas reconnue.
 */
export function extractYoutubeVideoId(input: string): string | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, '');
  const idRe = /^[a-zA-Z0-9_-]{6,15}$/;

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && idRe.test(id) ? id : null;
  }

  if (host === 'youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id && idRe.test(id) ? id : null;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (
      parts.length >= 2 &&
      ['embed', 'shorts', 'v', 'live'].includes(parts[0])
    ) {
      const id = parts[1];
      return idRe.test(id) ? id : null;
    }
  }

  return null;
}

export interface YouTubeMetadata {
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

/**
 * Récupère les métadonnées d'une vidéo via l'oEmbed public YouTube.
 * Fallbacks : si oEmbed échoue, on retourne un payload "Inconnu" + thumbnail
 * via l'URL prédictible. L'admin peut toujours corriger en re-créant.
 */
export async function fetchYoutubeMetadata(
  videoId: string,
  fullUrl: string,
): Promise<YouTubeMetadata> {
  const fallbackThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const preferredThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    fullUrl,
  )}&format=json`;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6_000);
    const res = await fetch(oembedUrl, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`oEmbed HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
    };
    return {
      title: data.title?.trim() || `Vidéo ${videoId}`,
      channelName: data.author_name?.trim() || 'Inconnu',
      // YouTube ne retourne maxresdefault que si dispo ; on le tente d'office
      // côté front via <img onError={fallback}> pour éviter un HEAD aller-retour.
      thumbnailUrl: preferredThumb,
    };
  } catch (err) {
    logger.warn(
      `oEmbed indisponible pour ${videoId} : ${
        err instanceof Error ? err.message : String(err)
      } — fallback`,
    );
    return {
      title: `Vidéo ${videoId}`,
      channelName: 'Inconnu',
      thumbnailUrl: fallbackThumb,
    };
  }
}
