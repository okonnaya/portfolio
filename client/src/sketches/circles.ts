import type { Sketch, SketchContext } from "../components/Canvas";
import { drawLoveStory } from "./loveStory";

/* Слой больших кругов (~10vh). Слой включается извне (setActive) на ховер/клик,
   и каждый круг появляется/пропадает со своей задержкой — вразнобой. Без фейда:
   круг просто включается целиком в момент своей задержки (не наезжает
   прозрачностью). По скроллу Hero дёргает setActive(false) — круги уходят тем же
   стаггером, что и на появлении (отдельного opacity-гашения слоя нет).

   Комбинация (число кругов COUNT_MIN..COUNT_MAX, позиции, цвета, задержки)
   случайна и генерится заново на каждом включении слоя (переход в active), а не
   один раз при setup — так каждое появление уникально. Кругов немного — рисуем
   их обычным arc+fill каждый кадр (спрайт-кеш как у поля не нужен). */

/* размеры кругов гоним от МЕНЬШЕЙ стороны вьюпорта, а не от высоты: на десктопе
   меньшая сторона и есть высота (поведение прежнее), а на телефоне высота втрое
   больше ширины — круги «в 20% высоты» выходили шириной в пол-экрана и слипались
   в пятно на всю страницу */
const SIZE_VMIN = 0.2; // диаметр круга в долях меньшей стороны вьюпорта
const COUNT_MIN = 5; // случайное число кругов в [MIN, MAX]
const COUNT_MAX = 11;
// на узком экране места под 5–11 кругов нет — там свой, меньший разброс
const NARROW_W = 760; // = мобильный брейкпоинт css
const COUNT_MIN_NARROW = 3;
const COUNT_MAX_NARROW = 6;
const PAD_VMIN = 0.06; // отступ центра круга от края (доли меньшей стороны)
// на сколько (доля диаметра) круги могут налезать друг на друга. 0.2 = не больше
// чем на 20% → мин. расстояние между центрами = 2r·(1 − 0.2) = 1.6r
const MAX_OVERLAP = 0.2;
const PLACE_TRIES = 40; // попыток подобрать непересекающуюся позицию для круга
// обводка и тень у всех кругов (эквивалент css stroke-width/stroke/drop-shadow —
// круги на канвасе, css к ним не применить). обводка идёт по контуру радиуса r:
// половина ширины внутрь (на заливку/картинку), половина наружу
const STROKE_WIDTH = 8;
const STROKE_COLOR = "#FFF";
// drop-shadow(0 2px 4px rgba(0,0,0,.08)): shadowBlur в канвасе задаётся в тех же
// единицах, что и css-радиус размытия
const SHADOW_COLOR = "rgba(0, 0, 0, 0.08)";
const SHADOW_BLUR = 4;
const SHADOW_OFFSET_Y = 2;

const COLORS = [
  "#FF1F8E",
  "#FF4DA2",
  "#FF69B4",
  "#FFE032",
  "#FD2121",
  "#32D3FF",
];

// Картинки, которыми могут заливаться круги (вместо цвета). Сюда добавляй ссылки
// (из /public — "/foo.png" — или внешние). Пусто → круги только цветные.
// hero7 здесь нет намеренно: этот кружок рисуется вживую (см. loveStory) и есть
// в каждой генерации — картинкой он был бы дублем.
const IMAGES: string[] = [
  "/hero3.svg",
  "/hero5.png",
  "/hero4.png",
  "/hero2.png",
  "/hero1.png",
  "/hero6.png",
  "/hero7.png",
  "/hero8.png",
  "/hero10.png",
];

// вероятность, что круг зальётся картинкой (а не цветом), если картинки есть/остались
const IMAGE_CHANCE = 0.5;
// сколько раз одна картинка может встретиться за одну генерацию. 1 = не более чем
// в одном кружочке за раз.
const IMAGE_MAX_USES = 1;
// сколько раз один цвет может встретиться за одну генерацию. 2 = не более чем в
// двух кружочках за раз.
const COLOR_MAX_USES = 2;

// Грузим картинки один раз, но НЕ в момент импорта модуля: круги показываются
// только по ховеру/клику на первом экране, а импорт случается на самой загрузке
// страницы — и эти файлы (около 300 кб) тянулись в конкуренции со шрифтом и
// превьюшками кейсов, то есть с тем, что видно сразу. Откладываем до простоя:
// к первому ховеру они успевают, а если нет — генерация просто отдаст такому
// кругу цвет вместо картинки (см. isReady в пуле ниже), эффект не ломается.
const loadedImages: HTMLImageElement[] = IMAGES.map(() => new Image());

const startLoading = () => {
  loadedImages.forEach((img, i) => {
    img.src = IMAGES[i];
  });
};

// requestIdleCallback есть не везде (сафари подтянул его поздно) — там просто
// уходим в конец очереди таймеров
if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(startLoading, { timeout: 2000 });
  } else {
    setTimeout(startLoading, 600);
  }
}

const isReady = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;

// появление/исчезновение вразнобой — у каждого круга своя задержка (без фейда)
const SPREAD_IN = 280; // мс — разброс задержек появления
const SPREAD_OUT = 180; // мс — разброс задержек ухода

type Circle = {
  x: number;
  y: number;
  r: number;
  color: string;
  img: HTMLImageElement | null; // если задана — круг заливается картинкой, не цветом
  // «love story» — рисуется вживую (градиент + сердце + счётчик), не цветом и не
  // картинкой. ровно один такой круг есть в каждой генерации
  loveStory: boolean;
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
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const r = (SIZE_VMIN * vmin) / 2; // один радиус на все круги
    const pad = PAD_VMIN * vmin;
    const narrow = window.innerWidth <= NARROW_W;
    const min = narrow ? COUNT_MIN_NARROW : COUNT_MIN;
    const max = narrow ? COUNT_MAX_NARROW : COUNT_MAX;
    const count = min + Math.floor(Math.random() * (max - min + 1));

    // пул картинок на эту генерацию: каждая готовая картинка добавляется
    // IMAGE_MAX_USES раз (может повториться один раз), затем перемешиваем и
    // выдаём по одной — так одна картинка не встретится чаще положенного
    const imagePool: HTMLImageElement[] = [];
    for (const img of loadedImages) {
      if (!isReady(img)) continue;
      for (let k = 0; k < IMAGE_MAX_USES; k++) imagePool.push(img);
    }
    for (let i = imagePool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [imagePool[i], imagePool[j]] = [imagePool[j], imagePool[i]];
    }

    // пул цветов на эту генерацию: каждый цвет добавляется COLOR_MAX_USES раз,
    // перемешиваем и выдаём по одному — так один цвет не встретится чаще нормы
    const colorPool: string[] = [];
    for (const color of COLORS)
      for (let k = 0; k < COLOR_MAX_USES; k++) colorPool.push(color);
    for (let i = colorPool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
    }

    // мин. расстояние между центрами: круги налезают не больше чем на MAX_OVERLAP
    const minDist = 2 * r * (1 - MAX_OVERLAP);
    const minDistSq = minDist * minDist;

    // один из кругов — «love story»: слот выбираем случайно, чтобы он не всегда
    // оказывался поверх/под остальными и не тяготел к одному месту
    const loveStoryAt = (Math.random() * count) | 0;

    circles = [];
    for (let i = 0; i < count; i++) {
      // подбираем позицию, не налезающую на уже поставленные круги сильнее нормы;
      // если за PLACE_TRIES попыток не нашли — ставим последнюю (лучше круг, чем дыра)
      let x = 0;
      let y = 0;
      for (let t = 0; t < PLACE_TRIES; t++) {
        x = pad + Math.random() * (W - pad * 2);
        y = pad + Math.random() * (H - pad * 2);
        let ok = true;
        for (const c of circles) {
          const dx = c.x - x;
          const dy = c.y - y;
          if (dx * dx + dy * dy < minDistSq) {
            ok = false;
            break;
          }
        }
        if (ok) break;
      }

      // love-story круг не берёт ни картинку, ни цвет — у него своя отрисовка;
      // иначе: если в пуле ещё есть картинки — с вероятностью IMAGE_CHANCE берём
      // картинку, иначе цвет
      const loveStory = i === loveStoryAt;
      const img =
        !loveStory && imagePool.length > 0 && Math.random() < IMAGE_CHANCE
          ? imagePool.pop()!
          : null;
      circles.push({
        x,
        y,
        r,
        // цвет из пула (не чаще COLOR_MAX_USES); если пул опустел — любой цвет
        color: colorPool.pop() ?? COLORS[(Math.random() * COLORS.length) | 0],
        img,
        loveStory,
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
  let drawnSecond = -1; // секунда, на которую отрисован счётчик love-story круга

  const draw = ({ ctx, width, height, time }: SketchContext) => {
    if (active !== prevActive) {
      stateChange = time;
      prevActive = active;
      asleep = false; // проснуться, чтобы отыграть появление/уход
      // каждое включение слоя — новая случайная комбинация (число/позиции/цвета/
      // задержки), а не только при перезагрузке. регенерим на переходе в active,
      // все круги стартуют скрытыми и проявляются своим стаггером
      if (active) generate(width, height);
    }
    // счётчик в love-story круге тикает раз в секунду — на смене секунды будим
    // слой на один кадр, чтобы перерисовать текст (остальное время слой спит)
    const second = (Date.now() / 1000) | 0;
    const tick =
      second !== drawnSecond && circles.some((c) => c.loveStory && c.shown);
    if (asleep && tick) asleep = false;
    if (asleep) return;
    drawnSecond = second;

    ctx.clearRect(0, 0, width, height); // прозрачный фон — кругов может не быть вовсе

    const elapsed = time - stateChange;
    let allAtTarget = true; // все ли круги уже в нужном состоянии
    for (const c of circles) {
      // круг переключается целиком в момент своей задержки (без фейда)
      const delay = active ? c.delayIn : c.delayOut;
      if (elapsed >= delay) c.shown = active;
      if (c.shown !== active) allAtTarget = false;
      if (!c.shown) continue; // не виден — не рисуем

      // тень: рисуем ею отдельный белый круг под содержимым, радиусом по внешнему
      // краю будущей обводки — иначе тень легла бы от каждого элемента круга
      // (заливка + обводка) дважды и потемнела
      ctx.save();
      ctx.shadowColor = SHADOW_COLOR;
      ctx.shadowBlur = SHADOW_BLUR;
      ctx.shadowOffsetY = SHADOW_OFFSET_Y;
      ctx.fillStyle = STROKE_COLOR;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + STROKE_WIDTH / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (c.loveStory) {
        drawLoveStory(ctx, c.x, c.y, c.r);
      } else if (c.img && isReady(c.img)) {
        // заливка картинкой: клипуем по кругу и рисуем cover-fit в квадрат 2r×2r
        const d = c.r * 2;
        const scale = Math.max(d / c.img.naturalWidth, d / c.img.naturalHeight);
        const w = c.img.naturalWidth * scale;
        const h = c.img.naturalHeight * scale;
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(c.img, c.x - w / 2, c.y - h / 2, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // обводка — поверх содержимого (у картинок и love-story оно доходит до
      // самого края, так что кольцо надо класть последним)
      ctx.lineWidth = STROKE_WIDTH;
      ctx.strokeStyle = STROKE_COLOR;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();
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
