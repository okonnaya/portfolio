import type { Sketch, SketchContext } from "../components/Canvas";

/* Отдельный слой КРУПНЫХ светящихся частиц #FEAAFF (plus-lighter).

   Рисуется на своём canvas поверх блюр-оверлея. Мягкость даёт радиальный
   градиент каждой частицы (не CSS-блюр — он на полный экран дорогой). Фон слоя
   прозрачный, режим plus-lighter, поэтому перекрытия частиц светлеют.

   Курсор на этот слой НЕ влияет. Вместо этого каждое пятно (кластер) слегка
   покачивается само по себе: медленный дрейф по синусоиде со своей фазой и
   скоростью, поэтому пятна двигаются независимо и недалеко от «дома». */

const COLOR_RGB = "254, 170, 255"; // #FEAAFF в rgb для градиента
const GLOW_SOFT = 10; // РАЗМЕР свечения = radius × GLOW_SOFT (не мягкость!)
const GLOW_CORE = 0.15; // доля радиуса с яркой сердцевиной; МЕНЬШЕ → мягче (длиннее хвост)
const GLOW_ALPHA = 0.4; // прозрачность пятна: 0 — невидимо, 1 — плотно
const SIZE_VH = 0.13; // крупные (основное поле ~2.5vh)
const SIZE_VARY = 0.4; // разброс диаметра: множитель в [1−SIZE_VARY, 1+SIZE_VARY]
const COVERAGE = 0.05; // их немного
const PAD = 30; // px у края, где частиц нет
const CLUSTER = 5; // во сколько раз рост от пятна вероятнее новой затравки
const JITTER = 2; // разброс внутри клетки
const SPACING = 2.5; // шаг сетки как доля диаметра: больше → пятна дальше, меньше слипаются

// дрейф пятна
const DRIFT = 14; // px — амплитуда покачивания
const DRIFT_PERIOD = 7000; // ms — базовый период (на пятно ±40%)

type Dot = { x: number; y: number; cluster: number; s: number };
type Motion = { ax: number; ay: number; sx: number; sy: number; px: number; py: number };

export function createBigGlow(): Sketch {
  let dots: Dot[] = [];
  let motion: Motion[] = []; // параметры дрейфа на каждый кластер
  let radius = 0;
  // спрайт свечения, отрисованный один раз (радиальный градиент дорого считать
  // попиксельно каждый кадр на каждую частицу — кешируем и блитим drawImage)
  let sprite: HTMLCanvasElement | null = null;
  let spriteR = 0; // логический радиус, под который отрендерен спрайт

  // отрисовать мягкое пятно (градиент с запечённой alpha) в офскрин-канвас под DPR
  const buildSprite = () => {
    const dpr = window.devicePixelRatio || 1;
    spriteR = radius * GLOW_SOFT * (1 + SIZE_VARY); // под самую крупную частицу
    const px = Math.max(1, Math.ceil(spriteR * 2 * dpr));
    const c = document.createElement("canvas");
    c.width = px;
    c.height = px;
    const s = c.getContext("2d")!;
    s.scale(dpr, dpr);
    const g = s.createRadialGradient(spriteR, spriteR, 0, spriteR, spriteR, spriteR);
    // яркая сердцевина (GLOW_CORE) → длинный плавный хвост. Промежуточные стопы
    // делают спад нелинейным (гауссо-образным), поэтому край мягкий, а не резкий.
    g.addColorStop(0, `rgba(${COLOR_RGB}, ${GLOW_ALPHA})`);
    g.addColorStop(GLOW_CORE, `rgba(${COLOR_RGB}, ${GLOW_ALPHA * 0.5})`);
    g.addColorStop(GLOW_CORE + (1 - GLOW_CORE) * 0.45, `rgba(${COLOR_RGB}, ${GLOW_ALPHA * 0.12})`);
    g.addColorStop(1, `rgba(${COLOR_RGB}, 0)`);
    s.fillStyle = g;
    s.fillRect(0, 0, spriteR * 2, spriteR * 2);
    sprite = c;
  };

  const generate = (W: number, H: number) => {
    const size = SIZE_VH * window.innerHeight;
    radius = size / 2;
    const cell = size * SPACING;
    const cols = Math.floor(W / cell);
    const rows = Math.floor(H / cell);
    const FADE = Math.min(W, H) * 0.12;

    const edgeFactor = (x: number, y: number) => {
      const d = Math.min(x, y, W - x, H - y);
      if (d <= PAD) return 0;
      if (d >= PAD + FADE) return 1;
      return (d - PAD) / FADE;
    };

    const n = cols * rows;
    const weight = new Float64Array(n);
    const cand: number[] = [];
    const cum: number[] = [];
    let total = 0;
    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const w = edgeFactor(cx * cell + cell / 2, ry * cell + cell / 2);
        if (w > 0) {
          const i = ry * cols + cx;
          weight[i] = w;
          cand.push(i);
          total += w;
          cum.push(total);
        }
      }
    }

    const placed = new Uint8Array(n);
    dots = [];
    motion = [];

    // зарегистрировать новый кластер и вернуть его id (со случайным дрейфом)
    const newCluster = () => {
      const base = (2 * Math.PI) / DRIFT_PERIOD;
      motion.push({
        ax: DRIFT * (0.7 + Math.random() * 0.6),
        ay: DRIFT * (0.7 + Math.random() * 0.6),
        sx: base * (0.6 + Math.random() * 0.8),
        sy: base * (0.6 + Math.random() * 0.8),
        px: Math.random() * Math.PI * 2,
        py: Math.random() * Math.PI * 2,
      });
      return motion.length - 1;
    };

    const frontier: { i: number; c: number }[] = [];
    const pushNeighbor = (cx: number, ry: number, c: number) => {
      if (cx < 0 || cx >= cols || ry < 0 || ry >= rows) return;
      const j = ry * cols + cx;
      if (placed[j] === 0 && weight[j] > 0) frontier.push({ i: j, c });
    };

    const placeCell = (i: number, c: number) => {
      placed[i] = 1;
      const cx = i % cols;
      const ry = (i - cx) / cols;
      const x = cx * cell + cell / 2 + (Math.random() - 0.5) * cell * JITTER;
      const y = ry * cell + cell / 2 + (Math.random() - 0.5) * cell * JITTER;
      const s = 1 + (Math.random() * 2 - 1) * SIZE_VARY; // случайный множитель диаметра
      dots.push({ x, y, cluster: c, s });
      pushNeighbor(cx - 1, ry, c);
      pushNeighbor(cx + 1, ry, c);
      pushNeighbor(cx, ry - 1, c);
      pushNeighbor(cx, ry + 1, c);
    };

    const pickSeed = () => {
      for (let tries = 0; tries < 64; tries++) {
        const t = Math.random() * total;
        let lo = 0;
        let hi = cum.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cum[mid] < t) lo = mid + 1;
          else hi = mid;
        }
        const i = cand[lo];
        if (!placed[i]) return i;
      }
      for (const i of cand) if (!placed[i]) return i;
      return -1;
    };

    const N = Math.min(
      Math.round((COVERAGE * W * H) / (Math.PI * radius * radius)),
      cand.length,
    );
    const pGrow = CLUSTER / (CLUSTER + 1);
    let count = 0;
    const first = pickSeed();
    if (first >= 0) {
      placeCell(first, newCluster());
      count++;
    }
    while (count < N) {
      if (frontier.length > 0 && Math.random() < pGrow) {
        // вырасти от пятна: наследуем кластер родителя
        const k = (Math.random() * frontier.length) | 0;
        const e = frontier[k];
        frontier[k] = frontier[frontier.length - 1];
        frontier.pop();
        if (placed[e.i]) continue;
        placeCell(e.i, e.c);
      } else {
        const i = pickSeed();
        if (i < 0) break;
        placeCell(i, newCluster()); // новая затравка → новое пятно
      }
      count++;
    }

    buildSprite();
  };

  // дрейф медленный — рендерим вполовину частоты (между кадрами держим прошлый),
  // экономя заливку/композитинг полноэкранного plus-lighter слоя
  let lastDraw = -Infinity;
  const FRAME_MS = 1000 / 30;

  const draw = ({ ctx, width, height, time }: SketchContext) => {
    if (time - lastDraw < FRAME_MS) return; // кадр не перерисовываем — висит прошлый
    lastDraw = time;

    ctx.clearRect(0, 0, width, height); // прозрачный фон — слой ложится поверх
    ctx.globalCompositeOperation = "plus-lighter" as GlobalCompositeOperation;

    // смещение каждого пятна на этот кадр (по разу на кластер, не на частицу)
    const ox = new Float64Array(motion.length);
    const oy = new Float64Array(motion.length);
    for (let c = 0; c < motion.length; c++) {
      const m = motion[c];
      ox[c] = m.ax * Math.sin(time * m.sx + m.px);
      oy[c] = m.ay * Math.sin(time * m.sy + m.py);
    }

    // мягкое свечение: блитим закешированный спрайт, масштабируя под диаметр
    // частицы (профиль градиента 0→край сохраняется при любом масштабе)
    const baseR = radius * GLOW_SOFT;
    if (sprite) {
      for (const d of dots) {
        const x = d.x + ox[d.cluster];
        const y = d.y + oy[d.cluster];
        const R = baseR * d.s; // у каждой частицы свой диаметр
        ctx.drawImage(sprite, x - R, y - R, R * 2, R * 2);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  return { setup: ({ width, height }) => generate(width, height), draw };
}
