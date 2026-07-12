import { Fragment } from "react";
import { Link } from "react-router-dom";
import { SiteFooter } from "./SiteChrome";
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
};

// «продуктовые кейсы»: каждый кейс сопровождается плейсхолдером под медиа,
// клик по которому ведёт на страницу кейса
const PRODUCT_CASES: CaseItem[] = [
  {
    slug: "ai-component",
    label: ["ии-решение в b2e продуктах"],
    desc: ["масштабируемый компонент для 7+ сервисов в инфре"],
    image: "case1.svg",
  },
  {
    slug: "search-button",
    label: ["кнопка поиска", "в инпуте"],
    desc: ["прикол, как одна кнопка\nпомогла 2к пользователей"],
  },
  {
    slug: "emotions-space",
    label: ["пространство", "для сохранения эмоций"],
    desc: ["дипломик\nв школе дизайна ниу вшэ"],
  },
  {
    slug: "ai-research-platform",
    label: ["ai research platform", "в сбере"],
    desc: ["согласованный концепт платформы для мечта бизнеса и ресерчеров"],
  },
];

// «для души»: личные проекты, тот же ритм ряд-плейсхолдер
const SOUL_CASES: CaseItem[] = [
  {
    slug: "over-the-rainbow",
    href: "https://youtu.be/dy7JG_fK-gQ?si=qzivTsX3kw403P_R",
    label: ["Israel Kamakawiwo’o —", "over the rainbow"],
    desc: ["стоп-моушен", "цветной бумагой"],
    image: "motion.webm",
  },
  { slug: "typeface", label: ["шрифт"], desc: ["колючая латиница"] },
  {
    slug: "yandex-music-party",
    label: ["вечеринка в яндекс музыке"],
    desc: ["шот с концептом"],
  },
];

// «special thanks»: пары имя · за что, выключены к центру
const THANKS: [string, string][] = [
  ["ксения александрова", "первая кураторка в вышке"],
  ["рустам шерифзанов", "преподавал мне артпрактику"],
  ["вадим булгаков", "дипломный руководитель"],
  ["олег пащенко", "преподаватель и ии-early-adopter"],
  ["ира папичева", "вторая кураторка в вышке"],
  ["маша ванурина", "путеводная звездочка"],
  ["настя малевич", "туз жезлов"],
  ["ксения шенько", "арт-дирка в агентстве"],
  ["ксюша санкович", "мой поддерживающий продакт"],
  ["никита худов", "world’s best boss в сбере"],
  ["виолетта постнова", "преподаватель и ориентир"],
  ["александра першеева", "преподавательница по искусству"],
  ["инна дудникова", "преподавательница и pmm"],
  ["florence + the machine", "dog days are over"],
  ["наруто", "учил никогда не сдаваться"],
];

// многострочный текст → строки, разделённые <br>.
// перенос можно задать и отдельным элементом массива, и \n внутри строки
function multiline(lines: Line[]) {
  return lines.flatMap((line) => line.split("\n")).map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

// ряд кейса: заголовок (левая колонка) + описание (правая), затем плейсхолдер-
// медиа, клик по которому открывает страницу кейса
function CaseRow({ item }: { item: CaseItem }) {
  const ariaLabel = `Открыть кейс: ${item.label.join(" ")}`;
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
      {item.href ? (
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
              <span className="thanks__note">{note}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* подвал */}
      <SiteFooter />
    </div>
  );
}
