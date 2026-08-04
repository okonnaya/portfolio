import { useEffect, useRef, type CSSProperties } from "react";
import { posterFor } from "../lib/media";

/**
 * Автоплей-луп, который начинает грузиться только когда доезжает до экрана.
 *
 * Зачем: раньше видео стояли обычными <video autoPlay>. Атрибут autoplay
 * заставляет браузер тянуть файл сразу на загрузке страницы — preload="metadata"
 * его не сдерживает, потому что для автозапуска нужны сами данные. На главной
 * это два лупа под первым экраном (стоп-моушен и концепт вечеринки), которые
 * пользователь увидит только после нескольких экранов скролла, а платил за них
 * трафиком с первой секунды.
 *
 * Как работает: preload="none" + никакого autoplay в разметке. Файл представлен
 * постером (лёгкий webp, собирается `npm run posters`), а play() дёргается из
 * IntersectionObserver, когда плитка появляется во вьюпорте. При уходе за
 * границу — pause(): луп за экраном зря греет процессор и жжёт батарейку.
 *
 * prefers-reduced-motion: сами не запускаем, но отдаём нативные контролы —
 * иначе стоп-моушен (а это самостоятельная работа, а не декор) остался бы
 * недоступным вообще.
 */
type Props = {
  src: string;
  className?: string;
  /** инлайн-стиль (например --ar с пропорцией плитки) */
  style?: CSSProperties;
  /** отступ срабатывания: за сколько до появления начинать грузить */
  rootMargin?: string;
};

export function LazyVideo({ src, className, style, rootMargin = "200px" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      video.controls = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // play() отклоняется, если браузер счёл автозапуск нежелательным
            // (политика автоплея, экономия трафика) — это не ошибка, просто
            // остаёмся на постере
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { rootMargin },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      src={src}
      poster={posterFor(src)}
      loop
      muted
      playsInline
      preload="none"
    />
  );
}
