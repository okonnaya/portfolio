import { useEffect, useRef } from "react";

/* Контекст, который скетч получает в setup/draw.
   Координаты и размеры — в CSS-пикселях (DPR уже учтён через ctx.scale),
   так что рисуем в логических единицах и не думаем про Retina. */
export type SketchContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** мс с момента запуска */
  time: number;
  /** мс с прошлого кадра */
  dt: number;
  mouse: { x: number; y: number; down: boolean };
};

/* Интерфейс скетча намеренно повторяет p5 (setup/draw),
   чтобы при переходе на p5 переписать только тело функций. */
export type Sketch = {
  setup?: (c: SketchContext) => void;
  draw: (c: SketchContext) => void;
};

type Props = {
  sketch: Sketch;
  className?: string;
  style?: React.CSSProperties;
  /** множитель к DPR для бэкинг-стора: <1 — рендер в пониженном разрешении
      (дешевле заливка/композитинг). Годится для размытых/мягких слоёв. */
  resolution?: number;
};

export function Canvas({ sketch, className, style, resolution = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // держим актуальный скетч в ref, чтобы не пересоздавать RAF-цикл на каждый рендер
  const sketchRef = useRef(sketch);

  useEffect(() => {
    sketchRef.current = sketch;
  }, [sketch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mouse = { x: 0, y: 0, down: false };
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = (window.devicePixelRatio || 1) * resolution;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // дальше рисуем в CSS-пикселях
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onDown = () => (mouse.down = true);
    const onUp = () => (mouse.down = false);

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    const base: Omit<SketchContext, "time" | "dt"> = { ctx, width, height, mouse };
    sketchRef.current.setup?.({ ...base, width, height, time: 0, dt: 0 });

    let raf = 0;
    const start = performance.now();
    let last = start;

    const loop = (now: number) => {
      const time = now - start;
      const dt = now - last;
      last = now;
      sketchRef.current.draw({ ctx, width, height, mouse, time, dt });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resolution]);

  return <canvas ref={canvasRef} className={className} style={style} />;
}
