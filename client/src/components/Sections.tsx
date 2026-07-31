import { Fragment, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiteFooter } from "./SiteChrome";
import { Gallery, type GallerySlide } from "./Gallery";
import { typo } from "../lib/typo";
import "./Sections.css";

/**
 * Блоки под первым экраном: «продуктовые кейсы», «для души», «the end».
 * Вёрстка подстроена под hero — та же центральная колонка (max 889px) и та же
 * двухколоночная сетка: слева выключка вправо (чёрный), справа выключка влево
 * (приглушённый). Розовые блоки — плейсхолдеры под картинки/видео кейсов.
 */

type Line = string;

type CaseItem = {
  slug: string; // адрес страницы кейса: /case/{slug}
  label: Line[]; // левая колонка — заголовок кейса (может быть в 2 строки)
  desc: Line[]; // правая колонка — короткое описание
  image?: string; // картинка-превью в плейсхолдере (путь от корня, напр. /avatar.jpg)
  href?: string; // внешняя ссылка вместо страницы кейса (открывается в новой вкладке)
  slides?: GallerySlide[]; // если задано — клик открывает галерею-лайтбокс вместо перехода
  static?: boolean; // плитка без ссылки/ховера/перехода — просто медиа
};

// «продуктовые кейсы»: каждый кейс сопровождается плейсхолдером под медиа,
// клик по которому ведёт на страницу кейса
const PRODUCT_CASES: CaseItem[] = [
  {
    slug: "ai-component",
    label: ["ии-решение\nв b2e продуктах"],
    desc: ["масштабируемый компонент для 7+ сервисов в инфре"],
    image: "/case1.svg",
  },
  {
    slug: "search-button",
    label: ["улучшение", "поиска"],
    desc: ["+4,19 п.п. к переходам\nодной UX-правкой"],
    image: "/case3_1.png",
  },
  {
    slug: "ai-research-platform",
    label: ["ai research", "platform"],
    desc: ["платформы для бизнеса\nи ресерчеров"],
    image: "/case2_1.png",
  },
];

// «для души»: личные проекты, тот же ритм ряд-плейсхолдер
const SOUL_CASES: CaseItem[] = [
    {
    slug: "yandex-music-party",
    label: ["вечеринка в яндекс музыке"],
    desc: ["шот с концептом"],
    image: "/yamusic.webm",
    static: true,
  },
    {
    slug: "emotions-space",
    label: ["пространство", "для сохранения эмоций"],
    desc: ["от исследования проблемы до MVP цифрового продукта"],
     image: "/case4_1.png",
  },
  
  // {
  //   slug: "typeface",
  //   label: ["шрифт"],
  //   desc: ["колючая латиница"],
  //   image: "/slide1.png", // первый слайд работает обложкой плитки
  //   slides: [
  //     { src: "/slide1.png" },
  //     { src: "/slide2.png", caption: "засечки-шипы и контраст" },
  //     { src: "/slide3.png", caption: "небольшой наклон оси" },
  //     { src: "/slide4.png" },
  //     { src: "/slide5.png", caption: "лигатуры" },
  //     { src: "/slide6.png" },
  //   ],
  // },
  {
    slug: "over-the-rainbow",
    href: "https://youtu.be/dy7JG_fK-gQ?si=qzivTsX3kw403P_R",
    label: ["Israel Kamakawiwo’o —", "over the rainbow"],
    desc: ["стоп-моушен", "цветной бумагой"],
    image: "/motion.webm",
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
  ["маша ванурина", "путеводная звездочка"],
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

// многострочный текст → строки, разделённые <br>.
// перенос можно задать и отдельным элементом массива, и \n внутри строки.
// typo расставляет неразрывные пробелы, чтобы предлоги не висели в конце строк
function multiline(lines: Line[]) {
  return lines.flatMap((line) => typo(line).split("\n")).map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

// ряд кейса: заголовок (левая колонка) + описание (правая), затем плейсхолдер-
// медиа, клик по которому открывает страницу кейса
function CaseRow({ item }: { item: CaseItem }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const phRef = useRef<HTMLButtonElement>(null);
  // прямоугольник плитки в момент открытия — из него «вырастает» галерея
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const openGallery = () => {
    setOriginRect(phRef.current?.getBoundingClientRect() ?? null);
    setGalleryOpen(true);
  };
  const ariaLabel = item.slides
    ? `Открыть галерею: ${item.label.join(" ")}`
    : `Открыть кейс: ${item.label.join(" ")}`;
  const isVideo = item.image?.endsWith(".webm") || item.image?.endsWith(".mp4");
  const media =
    item.image &&
    (isVideo ? (
      <video
        className="cases__img"
        src={item.image}
        autoPlay
        loop
        muted
        playsInline
      />
    ) : (
      <img className="cases__img" src={item.image} alt="" />
    ));
  return (
    <>
    <div className="case_block" id={`case-${item.slug}`}>
      <div className="cases__row">
        <p className="cases__label">{multiline(item.label)}</p>
        <p className="cases__desc">{multiline(item.desc)}</p>
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
        <Link to={`/case/${item.slug}`} className="cases__ph" aria-label={ariaLabel}>
          {media}
        </Link>
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

export function Sections() {
  return (
    <div className="cases-page">
      {/* продуктовые кейсы */}
      <section className="cases" aria-label="Продуктовые кейсы">
        <header className="cases__head">
          <h2 className="cases__title">
            продуктовые
            <br />
            кейсы
          </h2>
        </header>
        {PRODUCT_CASES.map((item, i) => (
          <CaseRow key={i} item={item} />
        ))}
      </section>

      {/* для души */}
      <section className="cases" aria-label="Для души">
        <header className="cases__head">
          <h2 className="cases__title">для души</h2>
        </header>
        {SOUL_CASES.map((item, i) => (
          <CaseRow key={i} item={item} />
        ))}
      </section>

      {/* the end · special thanks */}
      <section className="cases cases--thanks" aria-label="Благодарности">
        <header className="cases__head cases__head--split">
          <h2 className="cases__title cases__title--end">the end</h2>
          <h2 className="cases__title cases__title--muted">special thanks</h2>
        </header>
        <ul className="thanks">
          {THANKS.map(([name, note], i) => (
            <li className="thanks__row" key={i}>
              <span className="thanks__name">{name}</span>
              <span className="thanks__note">{typo(note)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* подвал */}
      <SiteFooter />
    </div>
  );
}
