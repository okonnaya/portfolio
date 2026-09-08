/* «love story» — особый кружок слоя circles: розовый радиальный градиент,
   сердце и живой счётчик времени от START. Рисуется на канвасе, а не заливается
   картинкой (как остальные), именно из-за счётчика — он тикает раз в секунду.

   Геометрия взята из макета (Figma node 307:20656, кружок 835×835) и приведена
   к текущему диаметру через масштаб k = 2r / D — поэтому все числа ниже можно
   читать прямо как координаты из макета. */

/** от этой даты (UTC) идёт отсчёт */
const START = Date.UTC(2019, 4, 31, 4, 24);

const D = 835; // диаметр кружка в макете — единица измерения для всего остального

// радиальный градиент фона: белый в центре → #FF5CB6 к краю
const STOPS: [number, string][] = [
  [0.0165, "#ffffff"],
  [0.2623, "#ffd6ed"],
  [0.5082, "#ffaedb"],
  [0.7541, "#ff85c8"],
  [1, "#ff5cb6"],
];

// сердце — один path из макета; Path2D понимает SVG-синтаксис d как есть.
// путь задан в своих координатах (viewBox 755.527×663) и ставится со сдвигом
// HEART_DX/HEART_DY внутри кружка
const HEART_PATH =
  "M755.527 196.53C755.527 86.5431 668.827 0 561.989 0C475.719 0 402.741 59.4347 377.743 139.741C352.724 59.4452 279.745 2.0683 193.475 2.0683C86.6166 2.0683 0 86.1441 0 196.173C0 251.692 22.1213 290.916 57.7234 332.891L377.921 663L697.752 332.891C733.385 290.916 755.527 252.007 755.527 196.53Z";
let heart: Path2D | null = null;
const getHeart = () => (heart ??= new Path2D(HEART_PATH));
const HEART_FILL = "#ff5cb6";
const HEART_DX = 39.736;
const HEART_DY = 132.928;

const TEXT_COLOR = "#f0f1f8";
const TEXT_TOP = 266.5; // верх текстового блока
const FONT_SIZE = 70;
const LINE_HEIGHT = 84;
const FONT_STACK =
  '"PP Neue Montreal Variable", -apple-system, Helvetica, "Inter", "Segoe UI", Roboto, Arial, sans-serif';

/** строки внутри кружка: две подписи + счётчик, разбитый на две строки как в макете */
const lines = () => {
  const total = Math.max(0, Math.floor((Date.now() - START) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor(total / 3600) % 24;
  const mins = Math.floor(total / 60) % 60;
  const secs = total % 60;
  return [
    "love story",
    "карина & фигма",
    `${days} days ${hours} hours`,
    `${mins} mins ${secs} secs`,
  ];
};

/** нарисовать кружок с центром (x, y) и радиусом r */
export function drawLoveStory(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  const k = (2 * r) / D; // масштаб «единицы макета → пиксели»

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // дальше работаем в координатах макета: (0,0) — левый верхний угол кружка
  ctx.translate(x - r, y - r);
  ctx.scale(k, k);

  const grad = ctx.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2);
  for (const [at, color] of STOPS) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, D, D);

  ctx.save();
  ctx.translate(HEART_DX, HEART_DY);
  ctx.fillStyle = HEART_FILL;
  ctx.fill(getHeart());
  ctx.restore();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `${FONT_SIZE}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rows = lines();
  for (let i = 0; i < rows.length; i++)
    ctx.fillText(rows[i], D / 2, TEXT_TOP + LINE_HEIGHT * (i + 0.5));

  ctx.restore();
}
