import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import { SiteFooter } from "./SiteChrome";
import { Gallery, type GallerySlide } from "./Gallery";
import { LazyVideo } from "./LazyVideo";
import { typo } from "../lib/typo";
import { isVideoSrc } from "../lib/media";
import { PORTFOLIO_VARIANT } from "../lib/site";
import "./Sections.css";

/**
 * Блоки под первым экраном: «продуктовые кейсы», «для души», «the end».
 * Вёрстка подстроена под hero — та же центральная колонка (max 889px) и та же
 * двухколоночная сетка: слева выключка вправо (чёрный), справа выключка влево
 * (приглушённый). Розовые блоки — плейсхолдеры под картинки/видео кейсов.
 */

type Line = string;

type CaseItem = {
  slug: string; // адрес страницы кейса: /case/{slug}
  label: Line[]; // левая колонка — заголовок кейса (может быть в 2 строки)
  desc: Line[]; // правая колонка — короткое описание
  facts?: Line[]; // короткие факты-лейблы под описанием кейса
  image?: string; // картинка-превью в плейсхолдере (путь от корня, напр. /avatar.jpeg)
  href?: string; // внешняя ссылка вместо страницы кейса (открывается в новой вкладке)
  slides?: GallerySlide[]; // если задано — клик открывает галерею-лайтбокс вместо перехода
  static?: boolean; // плитка без ссылки/ховера/перехода — просто медиа
};

// «продуктовые кейсы»: каждый кейс сопровождается плейсхолдером под медиа,
// клик по которому ведёт на страницу кейса
const MAIN_PRODUCT_CASES: CaseItem[] = [
  {
    slug: "ai-component",
    label: ["ai-ассистент\nв b2e"],
    desc: ["внутренний помощник\nдля корпоративной экосистемы"],
    facts: ["масштабирование на 7+ продуктов", "внедрение 3 → 1 спринт","для внедрения без дизайн-поддержки"],
    image: "/case1.png",
  },
  {
    slug: "search-button",
    label: ["поисковой\nсервис"],
    desc: ["отдельный продукт\nи встраиваемое решение"],
    facts: ["+4,19 п.п. одной правкой","инициатива из интервью", "метрики после релиза" ],
    image: "/case3_1.png",
  },
  {
    slug: "ai-research-platform",
    label: ["ai research", "platform"],
    desc: ["внутреннее решение\nдля коллаборации"],
    facts: ["исследование сценариев", "утверждено с первой защиты"],
    image: "/case2_1.png",
  },
  // проект личный, но по объёму это полноценный продуктовый кейс: ресёрч →
  // сегменты → юнит-экономика → mvp → первые платящие. в разделе «для души»
  // рядом со стоп-моушеном заголовок читался как «хобби, можно пролистать»,
  // и цикл целиком никто не открывал. что проект свой, а не рабочий, честно
  // написано в мете кейса — см. meta.team в CasePage.tsx
  {
    slug: "emotions-space",
    label: ["архив\nрадостей"],
    desc: ["от исследования\nдо MVP продукта"],
    facts: ["исследование → MVP", "30 интервью", "50+ активных пользователей"],
    image: "/case4_1.png",
  },
];

const KINOPOISK_PRODUCT_CASES: CaseItem[] = [
  MAIN_PRODUCT_CASES[3], // архив радостей
  MAIN_PRODUCT_CASES[1], // поисковой сервис
  MAIN_PRODUCT_CASES[0], // ai-компонент
  MAIN_PRODUCT_CASES[2], // ai research platform
];

const PRODUCT_CASES =
  PORTFOLIO_VARIANT === "kinopoisk" ? KINOPOISK_PRODUCT_CASES : MAIN_PRODUCT_CASES;

// «для души» — не список кейсов, а коллаж: то, что делалось без брифа и без
// метрик, и подписи ему только мешают. Плитки разложены свободно, поэтому
// геометрия задана прямо координатами макета (система 1200 × 3882.876 px,
// начало — верхний край первой плитки), а не сеткой. В проценты она
// пересчитывается в SoulCollage: колонка сайта резиновая, коллаж должен
// сжиматься вместе с ней целиком, сохраняя композицию.
const COLLAGE_W = 1200;
const COLLAGE_H = 3882.876;

type SoulTile = {
  key: string;
  x: number; // левый край, px макета
  y: number; // верхний край, px макета
  w: number;
  h: number;
  r: number; // скругление, px макета (в CSS уезжает в cqw и масштабируется)
  src?: string; // .webm → видео-луп, иначе картинка
  alt?: string; // у видео нет: LazyVideo рисует немой декоративный луп
  href?: string; // внешняя ссылка на работу
  /** пара скринов внутри одной плитки (в макете — один фрейм на две картинки) */
  pair?: { src: string; alt: string; w: number; h: number }[];
  /** на телефоне такие плитки не тянутся во всю ширину — см. Sections.css */
  small?: boolean;
};

const SOUL_TILES: SoulTile[] = [
  {
    key: "yamusic",
    x: 0,
    y: 0,
    w: 1200,
    h: 545.318,
    r: 32,
    src: "/yamusic.webm", // концепт совместной очереди в яндекс музыке
  },
  {
    key: "phones",
    x: 0.488,
    y: 593.514,
    w: 589,
    h: 590.525,
    r: 25.131,
    pair: [
      {
        src: "/soul/phone1.webp",
        alt: "экран концепта: размытые красные цветы и подпись «всё хорошо»",
        w: 272.483,
        h: 590.525,
      },
      {
        src: "/soul/phone2.webp",
        alt: "экран концепта: слово «останавливаться», набранное по кругам",
        w: 272.483,
        h: 588.693,
      },
    ],
  },
  {
    key: "gabdula",
    x: 600,
    y: 1216.535,
    w: 600,
    h: 600,
    r: 12.895,
    src: "/gabdula.webm", // «И туган тел» Габдуллы Тукая: «родной язык» на семи языках
  },
  {
    key: "poster",
    x: 308.156,
    y: 1886.835,
    w: 281.332,
    h: 395.584,
    r: 15.85,
    src: "/soul/poster.webp",
    alt: "афиша вечеринки «танцуем под сеты с lim и чихо»",
    small: true,
  },
  {
    key: "sticker",
    x: 0.488,
    y: 2303.392,
    w: 291.818,
    h: 176.427,
    r: 7.641,
    src: "/soul/sticker1.jpg",
    alt: "красная наклейка-коробочка в руке: «чихо это правда китай»",
    small: true,
  },
  {
    key: "diary",
    x: 810.366,
    y: 2329.393,
    w: 389.634,
    h: 345.883,
    r: 14.742,
    src: "/diary.webm", // пролистывание бумажного дневника
    small: true,
  },
  {
    key: "wall",
    x: 0.488,
    y: 2493.708,
    w: 291.818,
    h: 205.269,
    r: 15.85,
    src: "/soul/sticker2.webp",
    alt: "красные наклейки на стене: «мы с твоей 6 лет вместе, ну так, если ты не знал»",
    small: true,
  },
  {
    key: "flowers",
    x: 308.156,
    y: 2698.977,
    w: 298.743,
    h: 298.743,
    r: 14.742,
    src: "/flowers.webm", // плакат с красным букетом, «кечкенә әни»
    small: true,
  },
  {
    key: "motion",
    x: 0,
    y: 3213.876,
    w: 1200,
    h: 669,
    r: 32,
    src: "/motion.webm", // стоп-моушен цветной бумагой
    href: "https://youtu.be/dy7JG_fK-gQ?si=qzivTsX3kw403P_R",
  },
];

// Тот же набор работ плоским списком — источник для новых раскладок
// (масонри-колонки и квантованная сетка). Координат тут нет: раскладку считает
// CSS, из данных нужны только пропорции файла и «вес» плитки в композиции.
// w/h взяты из макета и совпадают с интринсиком файлов (макет = ½ пикселей).
type SoulWork = {
  key: string;
  caption?: string;
  captionSide?: "left" | "right";
  src: string; // .webm → видео-луп, иначе картинка
  alt?: string; // у видео нет: LazyVideo рисует немой декоративный луп
  href?: string; // внешняя ссылка на работу
  w: number;
  h: number;
  /** плитка-анкер: во всю ширину раскладки (обе колонки сетки) */
  wide?: boolean;
  /** вертикальная работа: в сетке занимает две строки, чтобы не резать её в квадрат */
  tall?: boolean;
};

// порядок = порядок чтения: два широких анкера (начало и финал) держат
// композицию, между ними — мелочь, которую масонри само разложит по колонкам.
//
// flowers, gabdula и motion лежат в public «бумерангами» — forward + reverse
// запечены в сам файл (npm run video:boomerang), поэтому обычный loop у
// LazyVideo проигрывает их туда-обратно. В браузере иначе никак: playbackRate
// не бывает отрицательным. Длинные diary и yamusic намеренно обычные лупы —
// у них цикл вперёд-назад вышел бы на полминуты
const SOUL_WORKS: SoulWork[] = [
  { key: "yamusic", src: "/yamusic.webm", w: 1200, h: 545.318, wide: true,
    caption: "концепт вечеринки в яндекс музыке" },
  {
    key: "poster",
    caption: "плакат к вечеринке",
    captionSide: "left",
    src: "/soul/poster.webp",
    alt: "афиша вечеринки «танцуем под сеты с lim и чихо»",
    w: 563,
    h: 792,
  },
  { key: "diary", src: "/diary.webm", w: 389.634, h: 345.883,
    caption: "мой блокнот с поездки в тбилиси" },
  {
    key: "soul-screen-2026-09-09",
    src: "/internetometer-original.mp4",
    w: 1736,
    h: 896,
    wide: true,
    caption: "рабочий концепт расширенного режима интернетометра",
  },
  
  { key: "gabdula", src: "/gabdula.webm", w: 600, h: 600,
    caption: "отрывок из типографического моушена", captionSide: "left" },
  {
    key: "sticker1",
    src: "/soul/sticker1.jpg",
    caption: "визитки для чихо",
    alt: "красная наклейка-коробочка в руке: «чихо это правда китай»",
    w: 584,
    h: 354,
  },
  {
    key: "phone1",
    src: "/soul/phone1.webp",
    caption: "обои на телефон",
    captionSide: "left",
    alt: "экран концепта: размытые красные цветы и подпись «всё хорошо»",
    w: 545,
    h: 1182,
    tall: true,
  },
  {
    key: "phone2",
    src: "/soul/phone2.webp",
    caption: "обои на телефон",
    alt: "экран концепта: слово «останавливаться», набранное по кругам",
    w: 545,
    h: 1178,
    tall: true,
  },

  {
    key: "sticker2",
    src: "/soul/sticker2.jpg",
    caption: "зин",
    captionSide: "left",
    alt: "красные наклейки на стене: «мы с твоей 6 лет вместе, ну так, если ты не знал»",
    w: 584,
    h: 411,
  },
   { key: "flowers", src: "/flowers.webm", w: 298.743, h: 298.743,
     caption: "отрывок из типографического моушена" },
  {
    key: "motion",
    src: "/motion.webm",
    w: 1200,
    caption: "стопмоушен для песни «over the rainbow»",
    h: 669,
    wide: true,
    href: "https://youtu.be/dy7JG_fK-gQ?si=qzivTsX3kw403P_R",
  },
];

// «special thanks»: пары имя · за что, выключены к центру
const THANKS: [string, string][] = [
  ["ксения александрова", "первая кураторка в вышке"],
  ["рустам шерифзанов", "преподавал мне артпрактику"],
  ["вадим булгаков", "дипломный руководитель"],
  ["олег пащенко", "преподаватель в вышке и ии-early-adopter"],
  ["настя тебякина", "вторая кураторка в вышке"],
  ["ира папичева", "преподавательница, боролась за мои учебные проекты"],
  ["маша ванурина", "путеводная звёздочка"],
  ["настя малевич", "туз жезлов"],
  ["ксения шенько", "арт-дирка в агентстве"],
  ["ксюша санкович", "мой поддерживающий продакт"],
  ["никита худов", "world’s best boss"],
  ["айдар насибуллин", "помогал деплоить первую версию портфолио"],
  ["виолетта постнова", "преподавательница в вышке и ориентир"],
  ["александра першеева", "преподавательница по истории искусств в вышке"],
  ["инна дудникова", "дипломная руководительница, преподавательница и pmm"],
  ["florence + the machine", "dog days are over"],
  ["наруто", "учил никогда не сдаваться"],
];

// сколько благодарностей видно до раскрытия. семнадцать строк — это экран с
// лишним в самом конце страницы, ровно там, где читатель решает, писать или
// нет. свёрнутый список сохраняет жест, но не съедает финал
const THANKS_PREVIEW = 3;

// «special thanks»: свёрнут до THANKS_PREVIEW строк, хвост уходит под градиент.
//
// Свёрнутые строки остаются в разметке (высота режется max-height, а не
// удалением узлов): так по ним работает поиск по странице, а от таба их прячет
// inert, чтобы фокус не уезжал в невидимое.
//
// Высоту меряем, а не задаём числом: строка — это «имя · за что», и на узком
// экране сетка складывается в одну колонку, где каждая строка вдвое выше, плюс
// длинные подписи переносятся. Любая формула из кегля и гэпа врала бы на части
// ширин. Берём координату строки под срезом и добавляем её половину — так под
// градиентом всегда видно, что список продолжается.
function Thanks() {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const [heights, setHeights] = useState<{ collapsed: number; full: number }>();

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const rows = Array.from(list.children) as HTMLElement[];
      const cut = rows[THANKS_PREVIEW];
      if (!cut) return;
      const next = {
        collapsed: Math.round(cut.offsetTop + cut.offsetHeight * 0.45),
        full: list.scrollHeight,
      };
      // ResizeObserver стреляет и на само раскрытие; без сравнения это был бы
      // лишний рендер на каждый кадр анимации
      setHeights((prev) =>
        prev && prev.collapsed === next.collapsed && prev.full === next.full
          ? prev
          : next,
      );
    };
    measure();
    // ловим и ресайз, и подмену фолбэка на PP Neue Montreal (font-display: swap):
    // после свопа метрики строк меняются, а с ними и высота среза
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  // до первого замера показываем список целиком: если скрипт почему-то не
  // отработал, лучше длинный список, чем обрезанный без возможности раскрыть
  const maxHeight = !heights
    ? undefined
    : open
      ? heights.full
      : heights.collapsed;

  return (
    <div className={`thanks-wrap${open ? " is-open" : ""}`}>
      <div className="thanks-clip">
        <ul className="thanks" ref={listRef} style={{ maxHeight }}>
          {THANKS.map(([name, note], i) => (
            <li
              className="thanks__row"
              key={i}
              inert={!open && heights && i >= THANKS_PREVIEW ? true : undefined}
            >
              <span className="thanks__name">{name}</span>
              <span className="thanks__note">{typo(note)}</span>
            </li>
          ))}
        </ul>
        <span className="thanks__fade" aria-hidden="true" />
      </div>
      {heights && (
        <button
          type="button"
          className="thanks__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "свернуть" : `ещё ${THANKS.length - THANKS_PREVIEW}`}
          <span className="thanks__chevron" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function renderLines(lines: Line[], transform: (line: string) => string) {
  return lines.flatMap((line) => transform(line).split("\n")).map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

// многострочный текст → строки, разделённые <br>.
// перенос можно задать и отдельным элементом массива, и \n внутри строки.
// typo расставляет неразрывные пробелы, чтобы предлоги не висели в конце строк
function multiline(lines: Line[]) {
  return renderLines(lines, typo);
}

function multilineMobileLoose(lines: Line[]) {
  const loose = lines
    .flatMap((line) => line.split("\n"))
    .join(" ")
    .replace(/\u00A0/g, " ");

  return typo(loose);
}

// ряд кейса: заголовок (левая колонка) + описание (правая), затем плейсхолдер-
// медиа, клик по которому открывает страницу кейса
function CaseRow({ item }: { item: CaseItem }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const phRef = useRef<HTMLButtonElement>(null);
  // прямоугольник плитки в момент открытия — из него «вырастает» галерея
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const openGallery = () => {
    setOriginRect(phRef.current?.getBoundingClientRect() ?? null);
    setGalleryOpen(true);
  };
  const ariaLabel = item.slides
    ? `Открыть галерею: ${item.label.join(" ")}`
    : `Открыть кейс: ${item.label.join(" ")}`;
  const isVideo = isVideoSrc(item.image);
  const media =
    item.image &&
    (isVideo ? (
      <LazyVideo className="cases__img" src={item.image} />
    ) : (
      // плитки кейсов лежат ниже первого экрана — грузим их по мере подхода
      // скролла, а не все сразу на загрузке страницы
      <img className="cases__img" src={item.image} alt="" loading="lazy" />
    ));
  return (
    <>
    <div className="case_block" id={`case-${item.slug}`}>
      <div className="cases__row">
        {/* h3 под h2 секции («продуктовые кейсы» / «для души»): список кейсов
            должен читаться парсером как список, а не как абзацы */}
        <h3 className="cases__label">
          <span className="cases__label-text cases__label-text--wide">
            {multiline(item.label)}
          </span>
          <span className="cases__label-text cases__label-text--mobile">
            {multilineMobileLoose(item.label)}
          </span>
        </h3>
        <p className="cases__desc">
          <span className="cases__desc-text cases__desc-text--wide">
            {multiline(item.desc)}
          </span>
          <span className="cases__desc-text cases__desc-text--mobile">
            {multilineMobileLoose(item.desc)}
          </span>
        </p>
      </div>
      {item.static ? (
        <div className="cases__ph cases__ph--static">{media}</div>
      ) : item.slides ? (
        <button
          type="button"
          ref={phRef}
          className="cases__ph cases__ph--gallery"
          aria-label={ariaLabel}
          onClick={openGallery}
        >
          {media}
          
        </button>
      ) : item.href ? (
        <a
          href={item.href}
          className="cases__ph"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
        >
          {media}
        </a>
      ) : (
        <Link to={`/case/${item.slug}/`} className="cases__ph" aria-label={ariaLabel}>
          {media}
        </Link>
      )}
      {/* факты-теги идут под плиткой и разведены по её краям — строка читается
          как подпись к картинке, а не как хвост описания */}
      {item.facts && (
        <ul className="cases__facts" aria-label="Короткие факты">
          {item.facts.map((fact) => (
            <li className="cases__fact" key={fact}>
              {typo(fact)}
            </li>
          ))}
        </ul>
      )}
      </div>
      {item.slides && galleryOpen && (
        <Gallery
          slides={item.slides}
          title={item.label.join(" ")}
          originRect={originRect}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </>
  );
}

// медиа плитки коллажа: видео-луп или картинка
function tileMedia(src: string, alt = "") {
  return isVideoSrc(src) ? (
    <LazyVideo className="soul__media" src={src} />
  ) : (
    <img className="soul__media" src={src} alt={alt} loading="lazy" />
  );
}

// коллаж «для души». Координаты макета → проценты от коробки коллажа, которые
// уезжают в CSS кастомными свойствами. Именно свойствами, а не готовыми
// left/top/width: инлайн-стиль не перебить медиазапросом, а на телефоне коллаж
// раскладывается в столбец и координаты там не нужны (см. Sections.css)
function SoulCollage() {
  return (
    <ul className="soul">
      {SOUL_TILES.map((tile) => {
        const style = {
          "--x": `${(tile.x / COLLAGE_W) * 100}%`,
          "--y": `${(tile.y / COLLAGE_H) * 100}%`,
          "--w": `${(tile.w / COLLAGE_W) * 100}%`,
          "--ar": `${tile.w} / ${tile.h}`,
          "--r": `${(tile.r / COLLAGE_W) * 100}cqw`,
        } as CSSProperties;
        const className = [
          "soul__tile",
          tile.pair && "soul__tile--pair",
          tile.small && "soul__tile--small",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <li className={className} style={style} key={tile.key}>
            {tile.pair ? (
              <div className="soul__pair">
                {tile.pair.map((shot) => (
                  <img
                    className="soul__media"
                    key={shot.src}
                    src={shot.src}
                    alt={shot.alt}
                    loading="lazy"
                    style={
                      {
                        "--pw": `${(shot.w / tile.w) * 100}%`,
                        "--par": `${shot.w} / ${shot.h}`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            ) : tile.href ? (
              <a
                className="soul__link"
                href={tile.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Стоп-моушен «over the rainbow» на ютубе"
              >
                {tileMedia(tile.src!, tile.alt)}
              </a>
            ) : (
              tileMedia(tile.src!, tile.alt)
            )}
          </li>
        );
      })}
    </ul>
  );
}

// медиа работы для новых раскладок: пропорция уезжает в CSS-переменную, чтобы
// место под плитку занималось до загрузки файла (в масонри без этого колонки
// пересобираются на каждой докачавшейся картинке)
function workMedia(work: SoulWork) {
  const style = { "--ar": `${work.w} / ${work.h}` } as CSSProperties;
  return isVideoSrc(work.src) ? (
    <LazyVideo className="soulw__media" src={work.src} style={style} />
  ) : (
    <img
      className="soulw__media"
      src={work.src}
      alt={work.alt ?? ""}
      loading="lazy"
      style={style}
    />
  );
}

// обёртка плитки: у работы со ссылкой — <a> с ховером, у остальных просто рамка
function workFrame(work: SoulWork) {
  const frameClass = `soulw__frame soulw__frame--${work.key}`;
  if (!work.href) return <div className={frameClass}>{workMedia(work)}</div>;
  return (
    <a
      className={`${frameClass} soulw__link`}
      href={work.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Стоп-моушен «over the rainbow» на ютубе"
    >
      {workMedia(work)}
    </a>
  );
}

// сколько колонок у масонри/сетки. 60vw центральной колонки на «обычном»
// ноутбуке (1440) дают ~270px на плитку — наклейки и афиша в такой ширине уже
// не читаются, поэтому три колонки только на широких экранах
function useSoulColumns() {
  const query = "(min-width: 1441px)";
  const [cols, setCols] = useState(() =>
    typeof window === "undefined" || !window.matchMedia(query).matches ? 2 : 3,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setCols(mq.matches ? 3 : 2);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return cols;
}

// раскладка «в самую короткую колонку» — тот же принцип, что у пинтереста.
//
// Почему не CSS-колонки (columns: 3): их балансировщик не умеет переставлять
// плитки, он только режет поток по порядку, и два вертикальных телефонных
// скрина утягивали свои колонки вниз — справа оставалась дыра в пол-экрана.
// Здесь порядок можно менять, и высота плитки известна заранее: ширина колонки
// у всех одна, значит высота = h/w в единицах этой ширины, и замеры DOM
// (а с ними мигание раскладки после загрузки картинок) не нужны.
function splitColumns(works: SoulWork[], cols: number) {
  const columns: SoulWork[][] = Array.from({ length: cols }, () => []);
  const heights: number[] = Array.from({ length: cols }, () => 0);
  for (const work of works) {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(work);
    heights[shortest] += work.h / work.w;
  }
  return columns;
}

// вариант 1 — «пинтерест»: плитки в своих пропорциях текут по колонкам.
// Широкие анкеры вынесены из колонок и лежат во всю ширину: первый — обложкой
// над полотном, остальные — под ним, поэтому блок читается как
// «обложка → полотно мелочи → финал», а не как ровный столбец карточек.
function SoulMasonry() {
  const cols = useSoulColumns();
  const firstBodyIndex = SOUL_WORKS.findIndex((work) => !work.wide);
  const splitAt = firstBodyIndex === -1 ? SOUL_WORKS.length : firstBodyIndex;
  const leadingAnchors = SOUL_WORKS.slice(0, splitAt).filter((work) => work.wide);
  const trailingAnchors = SOUL_WORKS.slice(splitAt).filter((work) => work.wide);
  const columns = splitColumns(
    SOUL_WORKS.slice(splitAt).filter((work) => !work.wide),
    cols,
  );
  const anchor = (work: SoulWork) => (
    <div className="soulw soulw--wide" key={work.key}>
      {workFrame(work)}
    </div>
  );
  return (
    <div className="soul-flow">
      {leadingAnchors.map(anchor)}
      <div className="soul-flow__cols">
        {columns.map((column, i) => (
          <div className="soul-flow__col" key={i}>
            {column.map((work) => (
              <div className="soulw" key={work.key}>
                {workFrame(work)}
              </div>
            ))}
          </div>
        ))}
      </div>
      {trailingAnchors.map(anchor)}
    </div>
  );
}

/**
 * Пауза лупов на время ховера: под курсором работа продолжает играть, все
 * остальные замирают на текущем кадре (соседи заодно гаснут — это уже css,
 * .soul-cells:has(...) в Sections.css).
 *
 * Почему js: css видео не останавливает, а LazyVideo знает только про
 * «видно/не видно» и сам ховер ему не виден.
 *
 * Запоминаем, что именно притормозили: вернуть в работу нужно ровно эти
 * видео, а не все подряд. Иначе после ховера поехали бы и те, что стоят на
 * постере намеренно — уехавшие за экран (их пауза — забота
 * IntersectionObserver в LazyVideo) и все лупы при prefers-reduced-motion,
 * где автозапуска нет вообще.
 */
function useFreezeOthers() {
  const gridRef = useRef<HTMLUListElement>(null);
  const frozen = useRef(new Set<HTMLVideoElement>());

  // play() отклоняется, если браузер счёл автозапуск нежелательным — это не
  // ошибка, просто остаёмся на кадре (как в LazyVideo)
  const play = (video: HTMLVideoElement) => void video.play().catch(() => {});

  // keep — видео плитки под курсором (null, если это картинка: тогда замирает
  // вообще всё)
  const freeze = (keep: HTMLVideoElement | null) => {
    const grid = gridRef.current;
    if (!grid) return;
    for (const video of grid.querySelectorAll("video")) {
      if (video === keep) {
        // курсор переехал на плитку, которую мы же и притормозили
        if (frozen.current.delete(video)) play(video);
      } else if (!video.paused) {
        frozen.current.add(video);
        video.pause();
      }
    }
  };

  const release = () => {
    for (const video of frozen.current) {
      // пока курсор стоял на плитке, страницу могли проскроллить: уехавшее за
      // экран видео запускать обратно незачем, его уже отпустил observer.
      // Полоса та же, что у LazyVideo (rootMargin), иначе лупы у кромки экрана
      // после ховера остались бы стоять: observer их считает видимыми, а
      // проверка по чистому вьюпорту — нет
      const box = video.getBoundingClientRect();
      const margin = 200;
      if (box.bottom > -margin && box.top < window.innerHeight + margin)
        play(video);
    }
    frozen.current.clear();
  };

  const onTileEnter = (e: React.PointerEvent<HTMLElement>) => {
    // на тачах ховер «залипает» после тапа: там плитки не гасим (см. css) и
    // лупы не тормозим
    if (e.pointerType === "touch") return;
    freeze(e.currentTarget.querySelector("video"));
  };

  return { gridRef, onTileEnter, release };
}

// вариант 2 — «сетка»: строгий модуль из квадратных ячеек (высота строки
// считается из ширины контейнера, см. Sections.css), где широкие работы
// занимают две колонки, а вертикальные — две строки. Ничего не обрезается
// «не по-своему»: пропорции квантуются по сетке, а не подгоняются кропом.
function SoulGrid() {
  const { gridRef, onTileEnter, release } = useFreezeOthers();
  return (
    // обёртка — контейнер для cq-единиц: высота строки в .soul-cells считается
    // из ширины блока, а cqw внутри самого контейнера мерил бы не его, а
    // ближайшего предка (контейнер не может запросить себя)
    <div className="soul-cells-box">
      {/* отпускаем лупы на выходе курсора из всей сетки, а не из плитки: между
          плитками есть зазор, и на нём иначе успевал бы проскочить лишний
          запуск-остановка */}
      <ul className="soul-cells" ref={gridRef} onPointerLeave={release}>
        {SOUL_WORKS.map((work) => (
          <li
            className={[
              "soulw",
              work.wide && "soulw--wide",
              work.tall && "soulw--tall",
            ]
              .filter(Boolean)
              .join(" ")}
            key={work.key}
            onPointerEnter={onTileEnter}
          >
            {workFrame(work)}
            {work.caption && (
              <span className={`soulw__caption${work.captionSide === "left" ? " soulw__caption--left" : ""}`}>
                {typo(work.caption)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// раскладка блока «для души». Основная — grid (квантованная сетка). Две
// остальные оставлены не для сайта, а чтобы сравнить: collage — исходная
// композиция из макета (абсолютные координаты), masonry — колонки-«пинтерест».
// Переключаются только адресом: /?soul=collage, /?soul=masonry
const SOUL_VARIANTS = ["grid", "masonry", "collage"] as const;
type SoulVariant = (typeof SOUL_VARIANTS)[number];
const SOUL_DEFAULT: SoulVariant = "grid";

function readSoulVariant(): SoulVariant {
  if (typeof window === "undefined") return SOUL_DEFAULT;
  const value = new URLSearchParams(window.location.search).get("soul");
  return SOUL_VARIANTS.includes(value as SoulVariant)
    ? (value as SoulVariant)
    : SOUL_DEFAULT;
}

type SectionsProps = {
  productTitle?: string;
};

export function Sections({ productTitle = "опыт" }: SectionsProps) {
  const [soulVariant] = useState<SoulVariant>(readSoulVariant);

  return (
    <div className="cases-page">
      {/* продуктовые кейсы */}
      <section className="cases" id="cases" aria-label="кейсы">
        <header className="cases__head">
          <h2 className="cases__title">
            {productTitle}
          </h2>
        </header>
        {PRODUCT_CASES.map((item) => (
          <CaseRow key={item.slug} item={item} />
        ))}
      </section>

      {/* для души */}
      <section
        className={`cases cases--soul cases--soul-${soulVariant}`}
        aria-label="Для души"
      >
        <header className="cases__head">
          <h2 className="cases__title">для{"\u00A0"}души</h2>
        </header>
        {soulVariant === "masonry" ? (
          <SoulMasonry />
        ) : soulVariant === "grid" ? (
          <SoulGrid />
        ) : (
          <SoulCollage />
        )}
      </section>

      {/* the end · special thanks */}
      <section className="cases cases--thanks" aria-label="Благодарности">
        <header className="cases__head cases__head--split">
          <h2 className="cases__title cases__title--end">the end</h2>
          <h2 className="cases__title cases__title--muted">special thanks</h2>
        </header>
        <Thanks />
      </section>

      {/* подвал */}
      <SiteFooter />

    </div>
  );
}
