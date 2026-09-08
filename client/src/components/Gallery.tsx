import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { typo } from "../lib/typo";
import { isVideoSrc, posterFor, videoSourcesFor } from "../lib/media";
import "./Gallery.css";

/**
 * Галерея-лайтбокс на весь экран. Открывается поверх страницы (портал в body),
 * листается стрелками на экране, клавишами ← →, свайпом на тач-устройствах.
 * Закрывается по Esc, кнопке ✕ или клику по затемнённому фону. На время показа
 * блокируется скролл страницы. Слайд без src — серый плейсхолдер с подписью.
 *
 * При открытии слайд «вырастает» из плитки, по которой кликнули (originRect):
 * стейдж анимируется от прямоугольника плитки к своему финальному положению,
 * фон параллельно проявляется. Закрытие проигрывает ту же анимацию в обратную
 * сторону и только потом размонтирует галерею.
 */

export type GallerySlide = { src?: string; caption?: string };

const DURATION = 460;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// keyframes трансформации между прямоугольником-источником (плитка) и текущим
// положением стейджа: сводим центры и масштабируем к размеру плитки
function flipKeyframes(from: DOMRect, target: DOMRect) {
  const dx = from.left + from.width / 2 - (target.left + target.width / 2);
  const dy = from.top + from.height / 2 - (target.top + target.height / 2);
  const sx = from.width / target.width;
  const sy = from.height / target.height;
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

export function Gallery({
  slides,
  startIndex = 0,
  title,
  originRect,
  onClose,
}: {
  slides: GallerySlide[];
  startIndex?: number;
  title?: string;
  originRect?: DOMRect | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const count = slides.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const closingRef = useRef(false); // защита от повторного закрытия во время анимации

  // сдвиг по кругу: с последнего — на первый и наоборот
  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count]
  );

  // закрытие с обратной анимацией: стейдж «схлопывается» обратно в плитку,
  // фон гаснет; onClose вызывается по завершении (или сразу, если анимировать
  // нечего / выключено системно)
  const close = useCallback(() => {
    if (closingRef.current) return;
    const stage = stageRef.current;
    const root = rootRef.current;
    if (!stage || !root || !originRect || prefersReducedMotion()) {
      onClose();
      return;
    }
    closingRef.current = true;
    const target = stage.getBoundingClientRect();
    stage.animate(
      [
        { transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
        { transform: flipKeyframes(originRect, target), opacity: 0.35 },
      ],
      { duration: DURATION, easing: EASING, fill: "forwards" }
    );
    const bg = root.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: DURATION,
      easing: EASING,
      fill: "forwards",
    });
    bg.onfinish = onClose;
  }, [originRect, onClose]);

  // анимация открытия: стейдж вырастает из плитки → в финальное положение
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !originRect || prefersReducedMotion()) return;
    const target = stage.getBoundingClientRect();
    stage.animate(
      [
        { transform: flipKeyframes(originRect, target), opacity: 0.35 },
        { transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
      ],
      { duration: DURATION, easing: EASING }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // клавиатура + блокировка скролла страницы на время показа
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, close]);

  // свайп: запоминаем старт, на отпускании листаем при заметном сдвиге
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const slide = slides[index];

  return createPortal(
    <div
      className="gallery"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "галерея"}
      ref={rootRef}
      onClick={close}
    >
      <button className="gallery__close" onClick={close} aria-label="закрыть">
        ✕
      </button>

      {count > 1 && (
        <button
          className="gallery__nav gallery__nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          aria-label="предыдущий слайд"
        >
          ←
        </button>
      )}

      <figure
        className="gallery__stage"
        ref={stageRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slide.src ? (
          isVideoSrc(slide.src) ? (
            <video
              className="gallery__media"
              poster={posterFor(slide.src)}
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              preload="metadata"
            >
              {videoSourcesFor(slide.src).map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
            </video>
          ) : (
            <img
              className="gallery__media"
              src={slide.src}
              alt={slide.caption ?? ""}
              // лайтбокс открывается по клику — картинка нужна сразу, не lazy
            />
          )
        ) : (
          <div className="gallery__ph">
            <span className="gallery__ph-label">
              {slide.caption ?? `слайд ${index + 1}`}
            </span>
          </div>
        )}
        {/* подпись рендерится всегда: место под неё зарезервировано в css,
            иначе слайд без подписи центрируется иначе и картинка «скачет» */}
        {slide.src && (
          <figcaption className="gallery__caption">
            {slide.caption && typo(slide.caption)}
          </figcaption>
        )}
      </figure>

      {count > 1 && (
        <button
          className="gallery__nav gallery__nav--next"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          aria-label="следующий слайд"
        >
          →
        </button>
      )}

      <div className="gallery__counter" onClick={(e) => e.stopPropagation()}>
        {index + 1} / {count}
      </div>
    </div>,
    document.body
  );
}
