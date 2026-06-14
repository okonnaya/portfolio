import type { Sketch, SketchContext } from "../components/Canvas";

/* Поле частиц, сгенерированное один раз при монтировании (DOM load).

   Первый цвет (#FF4DA2):
   - целевое покрытие COVERAGE, размер частицы — size;
   - кластеризация — растут пятнами от затравок (CLUSTER:1 — во сколько раз рост
     от существующего пятна вероятнее новой одиночной затравки);
   - затухание к краям: внутри PAD частиц нет, дальше плотность нарастает (FADE).

   Второй цвет (#FEAAFF):
   - их МЕНЬШЕ (SECONDARY — доля от числа первых);
   - затравки сеются либо вплотную к первым частицам, либо в кольце ~FAR_VH от
     них, в соотношении NEAR_RATIO:1;
   - дальше так же кластеризуются между собой (рост от своей границы).

   Кол-во частиц каждого цвета ДЕТЕРМИНИРОВАНО (случайно лишь расположение),
   поэтому при перезагрузке число не скачет.

   Поле генерируется один раз (позиции = «дом» каждой частицы), а draw каждый
   кадр рисует частицы заново с физикой ховера: импульс от курсора, трение,
   пружина к дому — поэтому композиция восстанавливается, когда курсор уходит. */

const COLOR = "#FF4DA2";
const COLOR2 = "#FEAAFF";
const COLOR3 = "#00D9FF";
const SIZE_VH = 0.025; // диаметр частицы в долях высоты вьюпорта (0.025 = 2.5vh)
const COVERAGE = 0.6; // доля площади под первыми частицами
const SECONDARY = 1.3; // множитель к числу первых → сколько вторых кластерами
const RIM_DENSITY = 0.8; // доля граничных клеток пятна под точками второго цвета
const TERTIARY = 0.2; // множитель к числу вторых частиц → сколько третьих
const PAD = 30; // px у края, где частиц нет
const CLUSTER = 15; // во сколько раз рост от пятна вероятнее новой затравки
const JITTER = 3; // разброс внутри клетки: смещение ±(JITTER/2)·клетки
const SPACING = 0.5; // шаг сетки как доля диаметра: <1 — точки плотнее налезают
const FAR_VH = 2; // «на расстоянии 2vh» для вторичной затравки
const NEAR_RATIO = 3; // вторичные: рядом с первыми : в кольце = NEAR_RATIO : 1

// ховер (как в первой анимации): импульс от курсора + трение + пружина домой
const REPEL_RADIUS = 240; // px — радиус влияния курсора
const REPEL = 2.2; // сила отталкивания
const FRICTION = 0.85; // затухание скорости
const SPRING = 0.06; // возврат к «домашней» позиции

type Dot = {
  x: number;
  y: number; // текущая позиция
  hx: number;
  hy: number; // «дом» — куда возвращается
  vx: number;
  vy: number; // скорость
  r: number;
  color: string;
};

// один шаг физики ховера для частицы (импульс от курсора + пружина + трение)
function applyPhysics(dot: Dot, mx: number, my: number) {
  const dx = dot.x - mx;
  const dy = dot.y - my;
  const d2 = dx * dx + dy * dy;
  if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.01) {
    const d = Math.sqrt(d2);
    const f = (1 - d / REPEL_RADIUS) * REPEL;
    dot.vx += (dx / d) * f;
    dot.vy += (dy / d) * f;
  }
  dot.vx += (dot.hx - dot.x) * SPRING;
  dot.vy += (dot.hy - dot.y) * SPRING;
  dot.vx *= FRICTION;
  dot.vy *= FRICTION;
  dot.x += dot.vx;
  dot.y += dot.vy;
}

export function createField(): Sketch {
  let dots: Dot[] = [];

  const generate = (W: number, H: number) => {
    const size = SIZE_VH * window.innerHeight;
    const r = size / 2;
    const cell = size * SPACING; // шаг сетки; <диаметра → точки плотнее налезают
    const cols = Math.floor(W / cell);
    const rows = Math.floor(H / cell);
    const FADE = Math.min(W, H) * 0.12; // зона спада плотности от PAD внутрь

    // вес ячейки по расстоянию до НИЖНЕГО края: 0 внутри PAD, 1 выше зоны FADE
    // (сверху/слева/справа padding нет — частицы доходят до кромки)
    const edgeFactor = (y: number) => {
      const d = H - y;
      if (d <= PAD) return 0;
      if (d >= PAD + FADE) return 1;
      return (d - PAD) / FADE;
    };

    // базовые веса + кумулятивный массив кандидатов для взвешенной затравки
    const n = cols * rows;
    const weight = new Float64Array(n);
    const cand: number[] = [];
    const cum: number[] = [];
    let total = 0;
    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const w = edgeFactor(ry * cell + cell / 2);
        if (w > 0) {
          const i = ry * cols + cx;
          weight[i] = w;
          cand.push(i);
          total += w;
          cum.push(total);
        }
      }
    }

    const placed = new Uint8Array(n); // 0 — пусто, 1 — первый цвет, 2 — второй

    dots = [];

    const pushNeighbor = (cx: number, ry: number, fr: number[]) => {
      if (cx < 0 || cx >= cols || ry < 0 || ry >= rows) return;
      const j = ry * cols + cx;
      if (placed[j] === 0 && weight[j] > 0) fr.push(j); // дубли отсеем при выемке
    };

    const placeCell = (i: number, mark: number, fr: number[], color: string) => {
      placed[i] = mark;
      const cx = i % cols;
      const ry = (i - cx) / cols;
      const x = cx * cell + cell / 2 + (Math.random() - 0.5) * cell * JITTER;
      const y = ry * cell + cell / 2 + (Math.random() - 0.5) * cell * JITTER;
      dots.push({ x, y, hx: x, hy: y, vx: 0, vy: 0, r, color });
      pushNeighbor(cx - 1, ry, fr);
      pushNeighbor(cx + 1, ry, fr);
      pushNeighbor(cx, ry - 1, fr);
      pushNeighbor(cx, ry + 1, fr);
    };

    // взвешенная по edgeFactor затравка (бинарный поиск в cum), пропуская занятые
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
      for (const i of cand) if (!placed[i]) return i; // запасной линейный проход
      return -1;
    };

    // достать случайную ещё-пустую ячейку из пула (swap-remove)
    const takeFromPool = (pool: number[]) => {
      while (pool.length) {
        const k = (Math.random() * pool.length) | 0;
        const i = pool[k];
        pool[k] = pool[pool.length - 1];
        pool.pop();
        if (placed[i] === 0) return i;
      }
      return -1;
    };

    const grow = (N: number, mark: number, color: string, seed: () => number) => {
      const fr: number[] = [];
      const pGrow = CLUSTER / (CLUSTER + 1);
      let count = 0;
      const first = seed();
      if (first >= 0) {
        placeCell(first, mark, fr, color);
        count++;
      }
      while (count < N) {
        let i = -1;
        if (fr.length > 0 && Math.random() < pGrow) {
          i = takeFromPool(fr);
          if (i < 0) continue;
        } else {
          i = seed();
          if (i < 0) break;
        }
        placeCell(i, mark, fr, color);
        count++;
      }
      return count;
    };

    // --- первый цвет: ровно N частиц, затравки взвешены по краю ---
    const N1 = Math.min(
      Math.round((COVERAGE * W * H) / (Math.PI * r * r)),
      cand.length,
    );
    const placedN1 = grow(N1, 1, COLOR, pickSeed);

    const farCells = Math.max(2, Math.round((FAR_VH * H) / 100 / cell));

    /* Засеять N частиц цвета `mark` рядом с уже стоящими частицами `targetMark`:
       затравки берутся вплотную (dist 1) или в кольце ~FAR_VH (dist farCells)
       в соотношении NEAR_RATIO:1, дальше частицы кластеризуются между собой. */
    const spawnNear = (
      targetMark: number,
      mark: number,
      color: string,
      N: number,
    ) => {
      // BFS-расстояние (в клетках) от каждой ячейки до ближайшей цели
      const dist = new Int32Array(n).fill(-1);
      const queue: number[] = [];
      for (let i = 0; i < n; i++)
        if (placed[i] === targetMark) {
          dist[i] = 0;
          queue.push(i);
        }
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head];
        const d = dist[i];
        if (d >= farCells) continue; // дальше кольца считать не нужно
        const cx = i % cols;
        const ry = (i - cx) / cols;
        const step = (ncx: number, nry: number) => {
          if (ncx < 0 || ncx >= cols || nry < 0 || nry >= rows) return;
          const j = nry * cols + ncx;
          if (dist[j] === -1) {
            dist[j] = d + 1;
            queue.push(j);
          }
        };
        step(cx - 1, ry);
        step(cx + 1, ry);
        step(cx, ry - 1);
        step(cx, ry + 1);
      }

      // пулы затравок: рядом (dist 1) и в кольце (~FAR_VH)
      const nearPool: number[] = [];
      const farPool: number[] = [];
      for (let i = 0; i < n; i++) {
        if (placed[i] !== 0 || weight[i] === 0) continue;
        if (dist[i] === 1) nearPool.push(i);
        else if (dist[i] === farCells) farPool.push(i);
      }

      const seed = () => {
        const useNear = Math.random() < NEAR_RATIO / (NEAR_RATIO + 1);
        let i = takeFromPool(useNear ? nearPool : farPool);
        if (i < 0) i = takeFromPool(useNear ? farPool : nearPool); // запасной пул
        return i;
      };

      return grow(N, mark, color, seed);
    };

    /* Обвести точками цвета `mark` край каждого пятна `targetMark`: ставим их
       на пустые клетки, примыкающие к пятну (граничное кольцо), с долей density. */
    const outline = (
      targetMark: number,
      mark: number,
      color: string,
      density: number,
    ) => {
      const seen = new Uint8Array(n);
      const rim: number[] = [];
      const add = (cx: number, ry: number) => {
        if (cx < 0 || cx >= cols || ry < 0 || ry >= rows) return;
        const j = ry * cols + cx;
        if (placed[j] === 0 && weight[j] > 0 && !seen[j]) {
          seen[j] = 1;
          rim.push(j);
        }
      };
      for (let i = 0; i < n; i++) {
        if (placed[i] !== targetMark) continue;
        const cx = i % cols;
        const ry = (i - cx) / cols;
        add(cx - 1, ry);
        add(cx + 1, ry);
        add(cx, ry - 1);
        add(cx, ry + 1);
      }
      const noFr: number[] = [];
      let count = 0;
      for (const i of rim) {
        if (Math.random() < density) {
          placeCell(i, mark, noFr, color); // без роста — только обводка
          count++;
        }
      }
      return count;
    };

    // --- второй цвет: кластеры рядом с первыми + обводка их края ---
    const n2clusters = spawnNear(1, 2, COLOR2, Math.round(placedN1 * SECONDARY));
    const n2rim = outline(1, 2, COLOR2, RIM_DENSITY);
    const placedN2 = n2clusters + n2rim;

    // --- третий цвет: по тому же принципу, рядом со вторыми ---
    spawnNear(2, 3, COLOR3, Math.round(placedN2 * TERTIARY));
  };

  const setup = ({ width, height }: SketchContext) => generate(width, height);

  // оптимизация: пока курсор не двигается и частицы успокоились — не перерисовываем
  // (иначе backdrop-filter над полем пересчитывается каждый кадр впустую)
  let lastMx = NaN;
  let lastMy = NaN;
  let asleep = false;

  const draw = ({ ctx, width, height, mouse }: SketchContext) => {
    if (mouse.x !== lastMx || mouse.y !== lastMy) asleep = false;
    lastMx = mouse.x;
    lastMy = mouse.y;
    if (asleep) return; // пиксели не меняются → нет лишнего перекомпозита

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    let maxE = 0; // максимальное «движение» по полю за кадр
    for (const dot of dots) {
      applyPhysics(dot, mouse.x, mouse.y);
      const e =
        Math.abs(dot.vx) +
        Math.abs(dot.vy) +
        Math.abs(dot.x - dot.hx) +
        Math.abs(dot.y - dot.hy);
      if (e > maxE) maxE = e;
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (maxE < 0.1) asleep = true; // всё на месте → засыпаем до движения курсора
  };

  return { setup, draw };
}
