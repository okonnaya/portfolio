import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SiteFooter, SiteHeader } from "./SiteChrome";
import "./CasePage.css";

/**
 * Страница отдельного кейса. Вёрстка повторяет первый экран: тот же навбар
 * (SiteHeader) и подвал (SiteFooter), та же центральная колонка (--content)
 * и двухколоночная сетка — слева выключка вправо (заголовки/названия секций),
 * справа выключка влево (описания, буллиты). Розовые блоки — плейсхолдеры
 * под картинки/видео. Контент по slug; сейчас наполнен кейс ai-component.
 */

// тело секции: либо буллиты, либо абзац текста
type Body = { bullets: string[] } | { text: string };

// одна единица медиа. src — картинка (путь от корня, напр. /case1_1.png); без
// неё показывается розовый плейсхолдер. tall — высокий блок. align — выключка
// подписи к центру: "left" (левая половина, текст вправо) — по умолчанию,
// "right" (правая половина, текст влево)
type MediaItem = { src?: string; tall?: boolean; caption?: string; align?: "left" | "right" };

type Block =
  // секция «название (лево) · описание (право)». lead — крупный заголовок кейса
  | { block: "section"; label: string; lead?: boolean; body: Body }
  // одиночное медиа во всю ширину колонки
  | ({ block: "media" } & MediaItem)
  // группа медиа, идущих подряд: несколько картинок в одном блоке с меньшим
  // гэпом между собой, чем между крупными блоками страницы
  | { block: "group"; items: MediaItem[] }
  // блок процесса: несколько тесных рядов «шаг (лево) · описание (право)»
  | { block: "steps"; rows: { label: string; text: string }[] };

type Case = { title: string; blocks: Block[] };

const CASES: Record<string, Case> = {
  "ai-component": {
    title: "ии-решение в b2e продуктах",
    blocks: [
      {
        block: "section",
        lead: true,
        label: "ии-решение в b2e продуктах",
        body: {
          bullets: [
            "запуск ии-фич сократился с 3 спринтов до 1 — дизайн и большинство UX-согласований исключены из процесса",
            "в проде на 7+ продуктах",
          ],
        },
      },
      { block: "media", src: "/case1.svg" },
      {
        block: "section",
        label: "",
        body: {
          text: "зафиксировала гайдлайны и собрала сквозный компонент AI-чата для внутренних продуктов на одной дизайн-системе. решение встраивается в любой продукт без участия дизайнера и не ломает существующие UX-паттерны",
        },
      },
      {
        block: "section",
        label: "контекст",
        body: {
          bullets: [
            "десяток внутренних продуктов на единой дизайн-системе с разными задачами, лейаутами и паттернами использования",
            "в 4-х из них уже были ИИ-фичи",
            "есть продукты, где нет штатного дизайнера и внедрение происходит только разработкой и менеджерами",
          ],
        },
      },
      {
        block: "section",
        label: "проблемы",
        body: {
          bullets: [
            "пользователь теряется, переходя между продуктами: разное расположение, поведение, вид чата",
            "существующие решения выглядят и работают по-разному",
            "без единого стандарта каждый продукт внедряет ии по-своему, и часть решений просто вредит пользователю",
            "растянутый t2m из-за количества согласований",
          ],
        },
      },
      { block: "media", src: "/case1_1.png" },
      {
        block: "steps",
        rows: [
          {
            label: "бенчмаркинг",
            text: "как устроены AI-виджеты у нас и вне, разбор существующих исследований индустрии. выделили 2 сценария: глобальный и контекстный",
          },
          {
            label: "аудит текущих решений",
            text: "точки входа, поведение, метрики.",
          },
          {
            label: "качественное исследование",
            text: "8 респондентов, пользователи уже существующих ии-фич во внутренних продуктах",
          },
          {
            label: "разработка и сборка гайдов",
            text: "пиксели туда-сюда, lottie-анимации экспорт-импорт, формулировки текстов под перечитывание Ильяхова, двиганье точек входа, поиск незанятого, но удобного шортката",
          },
          {
            label: "продуктовая защита",
            text: "согласование с десятком менеджером всех продуктов, разработкой и топ-менеджментом бизнес-юнита",
          },
        ],
      },
      { block: "media", src: "/case1_2.png" },
      {
        block: "section",
        label: "решение",
        body: {
          text: "компонент и гайд, который покрывает глобальный и контекстные флоу, ложится на существующие паттерны продуктов внедряется командой продукта самостоятельно, без дизайнера",
        },
      },
      {
        block: "section",
        label: "результат",
        body: {
          bullets: [
            "3 спринта → 1 спринт на запуск AI-виджета в продукте, из процесса исключена дизайн-часть — компонент готов к использованию из коробки",
            "в проде на 7+ продуктах",
            "гипотезы проверены на интервью",
            "согласовано с мендерами продуктов и топ-менеджментом бизнес-юнита без блокеров",
          ],
        },
      },
      { block: "group", items: [
  { src: "/case1_3.png" },
  { src: "/case1_4.png" },
]},
    ],
  },
};

// текст с переносами: \n в строке → <br>
function withBreaks(text: string) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

// правая колонка: буллиты (с точкой) или абзац текста
function BodyView({ body }: { body: Body }) {
  if ("bullets" in body) {
    return (
      <ul className="case__bullets">
        {body.bullets.map((item, i) => (
          <li className="case__bullet" key={i}>
            <span className="case__dot" aria-hidden="true" />
            <span>{withBreaks(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="case__text">{withBreaks(body.text)}</p>;
}

// одна единица медиа: картинка (или розовый плейсхолдер) + опциональная подпись
function MediaView({ item }: { item: MediaItem }) {
  return (
    <div className="case__media">
      {item.src ? (
        <img
          className={`case__img${item.tall ? " case__img--tall" : ""}`}
          src={item.src}
          alt={item.caption ?? ""}
        />
      ) : (
        <div className={`case__ph${item.tall ? " case__ph--tall" : ""}`} />
      )}
      {item.caption && (
        <p className={`case__caption case__caption--${item.align ?? "left"}`}>
          {item.caption}
        </p>
      )}
    </div>
  );
}

function BlockView({ block, id }: { block: Block; id?: string }) {
  if (block.block === "media") {
    return <MediaView item={block} />;
  }

  if (block.block === "group") {
    return (
      <div className="case__group">
        {block.items.map((item, i) => (
          <MediaView item={item} key={i} />
        ))}
      </div>
    );
  }

  if (block.block === "steps") {
    return (
      <div className="case__steps" id={id}>
        {block.rows.map((row, i) => (
          <div className="case__row" key={i}>
            <p className="case__label">{withBreaks(row.label)}</p>
            <div className="case__body">
              <p className="case__text">{withBreaks(row.text)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="case__row" id={id}>
      <p className={`case__label${block.lead ? " case__label--lead" : ""}`}>
        {withBreaks(block.label)}
      </p>
      <div className="case__body">
        <BodyView body={block.body} />
      </div>
    </div>
  );
}

// оглавление (toc): из содержательных блоков берём якоря — секции с непустым
// названием и блок процесса ("steps"). lead-секция (заголовок кейса) и медиа
// пропускаются. id блока = его индекс в массиве, чтобы совпадал с рендером.
type TocItem = { id: string; label: string };

function tocItems(blocks: Block[]): TocItem[] {
  const items: TocItem[] = [];
  blocks.forEach((block, i) => {
    if (block.block === "steps") {
      items.push({ id: `sec-${i}`, label: "процесс" });
    } else if (block.block === "section" && !block.lead && block.label) {
      items.push({ id: `sec-${i}`, label: block.label });
    }
  });
  return items;
}

// какие индексы блоков получают id (= есть в оглавлении)
function anchorIds(blocks: Block[]): Record<number, string> {
  const map: Record<number, string> = {};
  blocks.forEach((block, i) => {
    if (
      block.block === "steps" ||
      (block.block === "section" && !block.lead && block.label)
    ) {
      map[i] = `sec-${i}`;
    }
  });
  return map;
}

// scroll-spy: подсвечиваем пункт оглавления, чей блок ближе всего к верху
// вьюпорта. IntersectionObserver со смещением rootMargin — активной считается
// секция, пересёкшая верхнюю треть экрана.
function useActiveSection(items: TocItem[]) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (!items.length) return;
    const nodes = items
      .map((it) => document.getElementById(it.id))
      .filter((n): n is HTMLElement => n !== null);
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [items]);

  return active;
}

function CaseToc({ items }: { items: TocItem[] }) {
  const active = useActiveSection(items);
  if (!items.length) return null;

  const onClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="case__toc" aria-label="содержание">
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className={`case__toc-link${active === it.id ? " is-active" : ""}`}
          onClick={(e) => onClick(e, it.id)}
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}

export function CasePage() {
  const { slug = "" } = useParams();
  const data = CASES[slug];
  const items = data ? tocItems(data.blocks) : [];
  const ids = data ? anchorIds(data.blocks) : {};

  return (
    <main className="case-page">
      <SiteHeader />

      <div className="case">
        <Link className="case__back" to={`/#case-${slug}`}>
          ← назад
        </Link>

        <CaseToc items={items} />

        <div className="case__content">
          {data ? (
            data.blocks.map((block, i) => (
              <BlockView key={i} block={block} id={ids[i]} />
            ))
          ) : (
            <div className="case__row">
              <p className="case__label case__label--lead">кейс</p>
              <div className="case__body">
                <p className="case__text">
                  страница кейса — скоро здесь будет контент
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
