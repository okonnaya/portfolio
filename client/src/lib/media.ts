/** Медиа-хелперы, общие для главной и страниц кейсов. */

const VIDEO_RE = /\.(webm|mp4)$/;

/** видео ли это (по расширению файла) */
export function isVideoSrc(src?: string) {
  return !!src && VIDEO_RE.test(src);
}

/**
 * Постер к видео — первый кадр, который браузер показывает до того, как
 * подтянет само видео. Файлы лежат в /posters рядом с одноимённым видео и
 * собираются скриптом `npm run posters` (client/scripts/video-posters.mjs),
 * чтобы не поддерживать соответствие руками.
 *
 * /yamusic.webm → /posters/yamusic.webp
 */
export function posterFor(src: string) {
  const file = src.split("/").pop() ?? "";
  return `/posters/${file.replace(VIDEO_RE, "")}.webp`;
}
