import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { posterFor, videoSourcesFor } from "../lib/media";
import "./LazyVideo.css";

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
 * Как работает: нативный autoplay/muted/playsinline стоит прямо в разметке:
 * Safari надёжнее запускает такие видео сам, чем после одиночного play() из
 * IntersectionObserver. JS остаётся только как страховка: будит видимые лупы и
 * ставит на паузу те, что уехали за экран.
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

function pxFromRootMargin(rootMargin: string) {
  const first = rootMargin.trim().split(/\s+/)[0];
  return first?.endsWith("px") ? Number.parseFloat(first) || 0 : 0;
}

function isNearViewport(video: HTMLVideoElement, rootMargin: string) {
  const box = video.getBoundingClientRect();
  const margin = pxFromRootMargin(rootMargin);
  return box.bottom > -margin && box.top < window.innerHeight + margin;
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

export function LazyVideo({
  src,
  className,
  style,
  rootMargin = "200px",
  playOn = "view",
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [manualPlayback, setManualPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const sources = videoSourcesFor(src);

  useEffect(() => {
    const id = window.setTimeout(() => setManualPlayback(isSafariLike()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.controls = false;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();

    const play = () => {
      video.autoplay = true;
      video.setAttribute("autoplay", "");
      video.preload = "auto";
      if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();
      void video.play().catch(() => {});
    };

    const stop = () => {
      video.autoplay = false;
      video.removeAttribute("autoplay");
      video.pause();
    };

    const onPlaying = () => setIsPlaying(true);
    const onStopped = () => setIsPlaying(false);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onStopped);
    video.addEventListener("ended", onStopped);

    if (manualPlayback) {
      video.autoplay = false;
      video.removeAttribute("autoplay");
      video.preload = "metadata";

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) stop();
          }
        },
        { rootMargin },
      );
      observer.observe(video);

      return () => {
        observer.disconnect();
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("pause", onStopped);
        video.removeEventListener("ended", onStopped);
      };
    }

    // По ховеру: наблюдатель не нужен вовсе, ролик стоит на постере, пока на
    // него не навели. Уход курсора НЕ обрывает проигрывание — анимация
    // доигрывает круг до конца и только потом встаёт на первый кадр: обрубленное
    // на середине движение читается как баг, а не как реакция на курсор.
    // Поэтому в этом режиме нет атрибута loop: цикл крутим сами по событию
    // ended, пока курсор внутри.
    if (playOn === "hover") {
      let hovering = false;
      const playOnHover = () => {
        hovering = true;
        play();
      };
      // только снимаем флаг: доигрывает текущий круг, дальше сработает ended
      const release = () => {
        hovering = false;
      };
      const onEnded = () => {
        video.currentTime = 0;
        // круг повторяется, только пока курсор внутри; иначе замираем на первом
        // кадре — в том числе после единственного показа при первой прокрутке
        if (hovering) play();
      };
      video.addEventListener("pointerenter", playOnHover);
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
            play();
          }
        },
        { threshold: 0.5 },
      );
      intro.observe(video);

      return () => {
        intro.disconnect();
        video.removeEventListener("pointerenter", playOnHover);
        video.removeEventListener("pointerleave", release);
        video.removeEventListener("ended", onEnded);
      };
    }

    let shouldPlay = false;
    let retry = 0;
    let retryTimer = 0;
    let raf = 0;

    const kick = () => {
      raf = 0;
      if (!shouldPlay || !isNearViewport(video, rootMargin)) return;
      play();

      if (video.paused && retry < 8) {
        retry += 1;
        retryTimer = window.setTimeout(queueKick, 250 * retry);
      }
    };

    const queueKick = () => {
      if (!raf) raf = window.requestAnimationFrame(kick);
    };

    const stopRetry = () => {
      retry = 0;
      window.clearTimeout(retryTimer);
    };

    const onAutoPlaying = () => {
      stopRetry();
      setIsPlaying(true);
    };
    const onWake = () => {
      if (shouldPlay) queueKick();
    };

    video.removeEventListener("playing", onPlaying);
    video.addEventListener("playing", onAutoPlaying);
    window.addEventListener("scroll", onWake, { passive: true });
    window.addEventListener("resize", onWake);
    window.addEventListener("pageshow", onWake);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("pointerdown", onWake, { passive: true });
    window.addEventListener("touchstart", onWake, { passive: true });
    window.addEventListener("keydown", onWake);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // play() отклоняется, если браузер счёл автозапуск нежелательным
            // (политика автоплея, экономия трафика) — это не ошибка, просто
            // остаёмся на постере и повторяем попытку на ближайших wake-событиях.
            shouldPlay = true;
            queueKick();
          } else {
            shouldPlay = false;
            stopRetry();
            stop();
          }
        }
      },
      { rootMargin },
    );
    observer.observe(video);
    queueKick();

    return () => {
      observer.disconnect();
      stopRetry();
      if (raf) window.cancelAnimationFrame(raf);
      video.removeEventListener("playing", onAutoPlaying);
      video.removeEventListener("pause", onStopped);
      video.removeEventListener("ended", onStopped);
      window.removeEventListener("scroll", onWake);
      window.removeEventListener("resize", onWake);
      window.removeEventListener("pageshow", onWake);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("pointerdown", onWake);
      window.removeEventListener("touchstart", onWake);
      window.removeEventListener("keydown", onWake);
    };
  }, [manualPlayback, rootMargin, playOn]);

  const startManualPlayback = (event?: SyntheticEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const video = ref.current;
    if (!video) return;
    video.controls = false;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";
    if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();
    void video.play().catch(() => {});
  };

  const poster = posterFor(src);
  const videoClassName = "lazy-video__media";
  const rootClassName = ["lazy-video", manualPlayback && "lazy-video--manual", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={rootClassName} style={style}>
      <video
        ref={ref}
        className={videoClassName}
        poster={poster}
        /* в hover-режиме цикл крутится вручную (см. эффект): нативный loop не
           давал бы событию ended сработать, и ролик нельзя было бы остановить
           ровно на конце круга */
        loop={playOn !== "hover"}
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        autoPlay={!manualPlayback && playOn === "view"}
        /* Для Safari важнее ручной понятный старт, чем невидимая борьба с
           autoplay-политикой. Остальные браузеры оставляем на быстрых лупах. */
        preload={!manualPlayback && playOn === "view" ? "auto" : "metadata"}
      >
        {sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
      </video>
      {manualPlayback && !isPlaying && (
        <img className="lazy-video__poster" src={poster} alt="" aria-hidden="true" />
      )}
      {manualPlayback && !isPlaying && (
        <span
          className="lazy-video__play"
          role="button"
          tabIndex={0}
          aria-label="Запустить видео"
          onPointerDown={startManualPlayback}
          onClick={startManualPlayback}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              startManualPlayback(event);
            }
          }}
        >
          <span className="lazy-video__play-icon" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
