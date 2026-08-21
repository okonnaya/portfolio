/** Медиа-хелперы, общие для главной и страниц кейсов. */

const VIDEO_RE = /\.(webm|mp4)$/i;
const WEBM_RE = /\.webm$/i;

type VideoSource = {
  src: string;
  type: string;
};

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

function isSafariLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return (
    iOS ||
    (/safari/i.test(ua) &&
      !/chrome|chromium|crios|fxios|android/i.test(ua))
  );
}

/**
 * Источники для <video>. Для .webm рядом ожидается одноимённый .mp4: Safari
 * иногда либо не умеет WebM-кодек, либо выбирает его слишком оптимистично.
 */
export function videoSourcesFor(src: string): VideoSource[] {
  if (!WEBM_RE.test(src)) return [{ src, type: "video/mp4" }];

  const mp4 = src.replace(WEBM_RE, ".mp4");
  const webm = { src, type: 'video/webm; codecs="vp9"' };
  const fallback = { src: mp4, type: 'video/mp4; codecs="avc1.42E01E"' };

  return isSafariLike() ? [fallback, webm] : [webm, fallback];
}
