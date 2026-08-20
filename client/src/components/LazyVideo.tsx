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
  /**
   * что запускает ролик: "view" — появление во вьюпорте и луп, пока он там
   * (по умолчанию), "hover" — один показ при первой прокрутке до блока, дальше
   * только по наведению курсора. hover нужен там, где вечное движение спорит с
   * соседним контентом, но про анимацию всё равно надо дать знать
   */
  playOn?: "view" | "hover";
};

export function LazyVideo({
  src,
  className,
  style,
  rootMargin = "200px",
  playOn = "view",
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      video.controls = true;
      return;
    }

    // По ховеру: наблюдатель не нужен вовсе, ролик стоит на постере, пока на
    // него не навели. Уход курсора НЕ обрывает проигрывание — анимация
    // доигрывает круг до конца и только потом встаёт на первый кадр: обрубленное
    // на середине движение читается как баг, а не как реакция на курсор.
    // Поэтому в этом режиме нет атрибута loop: цикл крутим сами по событию
    // ended, пока курсор внутри.
    if (playOn === "hover") {
      let hovering = false;
      const play = () => {
        hovering = true;
        void video.play().catch(() => {});
      };
      // только снимаем флаг: доигрывает текущий круг, дальше сработает ended
      const release = () => {
        hovering = false;
      };
      const onEnded = () => {
        video.currentTime = 0;
        // круг повторяется, только пока курсор внутри; иначе замираем на первом
        // кадре — в том числе после единственного показа при первой прокрутке
        if (hovering) void video.play().catch(() => {});
      };
      video.addEventListener("pointerenter", play);
      video.addEventListener("pointerleave", release);
      video.addEventListener("ended", onEnded);

      // один показ при первой прокрутке до блока: пользователь должен увидеть,
      // что здесь вообще есть анимация, иначе про ховер он не догадается.
      // threshold 0.5 — «долистали», а не «краем зацепили»; наблюдатель
      // отключается сразу после единственного срабатывания, дальше только ховер
      const intro = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            intro.disconnect();
            void video.play().catch(() => {});
          }
        },
        { threshold: 0.5 },
      );
      intro.observe(video);

      return () => {
        intro.disconnect();
        video.removeEventListener("pointerenter", play);
        video.removeEventListener("pointerleave", release);
        video.removeEventListener("ended", onEnded);
      };
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
  }, [rootMargin, playOn]);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      src={src}
      poster={posterFor(src)}
      /* в hover-режиме цикл крутится вручную (см. эффект): нативный loop не
         давал бы событию ended сработать, и ролик нельзя было бы остановить
         ровно на конце круга */
      loop={playOn !== "hover"}
      muted
      playsInline
      /* по ховеру ждать нечего: пока курсор доедет, метаданные уже есть, и
         первый кадр появляется без паузы на загрузку. в остальных режимах
         ролик может быть за несколькими экранами — там по-прежнему none */
      preload={playOn === "hover" ? "metadata" : "none"}
    />
  );
}
