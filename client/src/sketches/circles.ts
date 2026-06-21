import type { Sketch, SketchContext } from "../components/Canvas";

/* Слой больших кругов (~10vh). Слой включается извне (setActive) на ховер/клик,
   и каждый круг появляется/пропадает со своей задержкой — вразнобой. Без фейда:
   круг просто включается целиком в момент своей задержки (не наезжает
   прозрачностью). По скроллу Hero дёргает setActive(false) — круги уходят тем же
   стаггером, что и на появлении (отдельного opacity-гашения слоя нет).

   Количество кругов случайно (COUNT_MIN..COUNT_MAX) и фиксируется при setup,
   позиции и размеры тоже случайны. Кругов немного — рисуем их обычным arc+fill
   каждый кадр (спрайт-кеш как у поля не нужен). */

const SIZE_VH = 0.1; // диаметр круга в долях высоты вьюпорта (~10vh), у всех один
const COUNT_MIN = 5; // случайное число кругов в [MIN, MAX]
const COUNT_MAX = 11;
const PAD_VH = 0.06; // отступ центра круга от края (доли высоты)
const COLORS = [
  "#FF1F8E",
  "#FF4DA2",
  "#FF69B4",
  "#FE8AD0",
  "#FEAAFF",
  "#FFC2F0",
];

// появление/исчезновение вразнобой — у каждого круга своя задержка (без фейда)
const SPREAD_IN = 280; // мс — разброс задержек появления
const SPREAD_OUT = 180; // мс — разброс задержек ухода

type Circle = {
  x: number;
  y: number;
  r: number;
  color: string;
  delayIn: number; // мс от начала показа до момента появления
  delayOut: number; // мс от снятия показа до момента ухода
  shown: boolean; // виден ли круг сейчас (включается/выключается целиком)
};

export type Circles = {
  sketch: Sketch;
  /** включить/выключить слой — круги проявятся/растают вразнобой */
  setActive: (v: boolean) => void;
};

export function createCircles(): Circles {
  let circles: Circle[] = [];
  let active = false;

  const generate = (W: number, H: number) => {
    const r = (SIZE_VH * window.innerHeight) / 2; // один радиус на все круги
    const pad = PAD_VH * window.innerHeight;
    const count =
      COUNT_MIN + Math.floor(Math.random() * (COUNT_MAX - COUNT_MIN + 1));
    circles = [];
    for (let i = 0; i < count; i++) {
      circles.push({
        x: pad + Math.random() * (W - pad * 2),
        y: pad + Math.random() * (H - pad * 2),
        r,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        delayIn: Math.random() * SPREAD_IN,
        delayOut: Math.random() * SPREAD_OUT,
        shown: false,
      });
    }
  };

  const setup = ({ width, height }: SketchContext) => generate(width, height);

  // пока все круги доехали до своего состояния и слой статичен — не перерисовываем
  let asleep = true;
  let stateChange = 0; // время последней смены active — от него идут задержки
  let prevActive = false;

  const draw = ({ ctx, width, height, time }: SketchContext) => {
    if (active !== prevActive) {
      stateChange = time;
      prevActive = active;
      asleep = false; // проснуться, чтобы отыграть появление/уход
    }
    if (asleep) return;

    ctx.clearRect(0, 0, width, height); // прозрачный фон — кругов может не быть вовсе

    const elapsed = time - stateChange;
    let allAtTarget = true; // все ли круги уже в нужном состоянии
    for (const c of circles) {
      // круг переключается целиком в момент своей задержки (без фейда)
      const delay = active ? c.delayIn : c.delayOut;
      if (elapsed >= delay) c.shown = active;
      if (c.shown !== active) allAtTarget = false;
      if (!c.shown) continue; // не виден — не рисуем

      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (allAtTarget) asleep = true; // все переключились → засыпаем до смены active
  };

  return {
    sketch: { setup, draw },
    setActive: (v: boolean) => {
      active = v;
    },
  };
}
