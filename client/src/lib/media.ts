/** Медиа-хелперы, общие для главной и страниц кейсов. */

const VIDEO_RE = /\.(webm|mp4)$/i;
const WEBM_RE = /\.webm$/i;
const VIDEO_VERSION = "20260904-safari";

type VideoSource = {
  src: string;
  type: string;
};

/** видео ли это (по расширению файла) */
export function isVideoSrc(src?: string) {
  return !!src && VIDEO_RE.test(src);
}

/**
 * Постер к видео — первый кадр, который браузер показывает до того, как
 * подтянет само видео. Файлы лежат в /posters рядом с одноимённым видео и
 * собираются скриптом `npm run posters` (client/scripts/video-posters.mjs),
 * чтобы не поддерживать соответствие руками.
 *
 * /yamusic.webm → /posters/yamusic.webp
 */
export function posterFor(src: string) {
  const file = src.split("/").pop() ?? "";
  if (file === "internetometer-original.mp4") {
    return withVideoVersion("/posters/internetometer-original.png");
  }
  return withVideoVersion(`/posters/${file.replace(VIDEO_RE, "")}.webp`);
}

function withVideoVersion(src: string) {
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}v=${VIDEO_VERSION}`;
}

/**
 * Источники для <video>. Для .webm рядом ожидается одноимённый .mp4: Safari
 * иногда либо не умеет WebM-кодек, либо выбирает его слишком оптимистично.
 * MP4 ставим первым всегда: сайт пререндерится, и Safari может начать выбор
 * источника ещё до гидрации React, когда browser-specific порядок уже поздно
 * переставлять. Codec-string не уточняем: Safari очень чувствителен к
 * расхождению type/codecs и реального H.264-потока.
 */
export function videoSourcesFor(src: string): VideoSource[] {
  if (!WEBM_RE.test(src)) return [{ src: withVideoVersion(src), type: "video/mp4" }];

  const mp4 = src.replace(WEBM_RE, ".mp4");
  const fallback = { src: withVideoVersion(mp4), type: "video/mp4" };
  const webm = { src: withVideoVersion(src), type: "video/webm" };

  return [fallback, webm];
}
