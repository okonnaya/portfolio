import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiteFooter } from "./SiteChrome";
import { typo } from "../lib/typo";
import {
  EMAIL,
  EMAIL_URL,
  SITE_URL,
  TELEGRAM_HANDLE,
  TELEGRAM_URL,
} from "../lib/contacts";
import "./CvPage.css";

/**
 * Страница резюме (/cv). Направляющие свои — как в макете, а не как в кейсах:
 * колонка контента шире (--content), сетка 30% | 1fr, названия разделов слева
 * с выключкой влево, период — отдельной колонкой у правого края. Навбара на
 * странице нет: сверху сама шапка резюме (аватар · имя), навигация — кнопки
 * «назад»/«скачать» по краям вьюпорта, как в кейсах. Размеры типографики —
 * общие токены сайта (--fs-*).
 */

// пункт раздела: название + подзаголовок + буллиты, справа период
type Entry = {
  title: string;
  subtitle?: string;
  period?: string; // \n — перенос («апрель 2025 –\nсейчас»)
  bullets?: string[];
};

// абзац скиллов: перечисление через запятую. Категории остались, но не
// подписаны — их держит разбивка на абзацы: сплошной список из тридцати
// инструментов эйчар не читает, а проматывает, тогда как по группам видно,
// чего в наборе много, а чего нет
type Note = { text: string };

// раздел: название слева, справа либо пункты, либо абзацы (скиллы)
type Section = { label: string; entries?: Entry[]; notes?: Note[] };

const NAME = "карина\nрамазанова";
const MOBILE_NAME = "карина р.";
const ROLE = "продуктовый дизайнер";

// контакты — кликабельные: телеграм ведёт в чат, почта открывает письмо.
// в cv.pdf ссылки остаются рабочими (chrome сохраняет их при печати)
// адрес портфолио первым, но только на бумаге (printOnly): cv.pdf пересылают
// отдельно от ссылки, и без него из файла не попасть в кейсы, — а на самом
// сайте ссылка на этот же сайт лишняя. пока SITE_URL пуст (см.
// lib/contacts.ts), строки просто нет — пустая ссылка хуже её отсутствия
const CONTACTS: { label: string; href: string; printOnly?: boolean }[] = [
  ...(SITE_URL ? [{ label: "портфолио", href: SITE_URL, printOnly: true }] : []),
  { label: TELEGRAM_HANDLE, href: TELEGRAM_URL },
  { label: EMAIL, href: EMAIL_URL },
];

const ABOUT =
  "продуктовый дизайнер с опытом сложных цифровых продуктов. люблю, когда дизайн не только решает задачи, но и выглядит классно. писала код до появления chatgpt :)";

// файл резюме. собирается из этой же страницы на каждой сборке
// (client/scripts/cv-pdf.mjs), поэтому не расходится с текстом ниже
const CV_FILE = "/cv.pdf";
const CV_FILENAME = "karina-ramazanova-cv.pdf";

// заголовок страницы: попадает и в таб, и в метаданные cv.pdf (chrome берёт
// /Title из document.title, когда печатает страницу в файл)
const PAGE_TITLE = "карина рамазанова — cv";

const SECTIONS: Section[] = [
  {
    label: "опыт работы",
    entries: [
      {
        title: "яндекс",
        subtitle: "дизайнер продукта",
        period: "апрель 2025 –\nсейчас",
        bullets: [
          "отвечаю за весь дизайн двух внутренних продуктов: от исследований и сценариев до релиза и метрик",
          "унифицировала ии-фичи: сократила внедрение с 3 до 1 спринта и сделала его самостоятельным для продуктовых команд",
          "вела дизайн нового AI-продукта от исследования до запуска в прод",
          "вела редизайн продукта с полным циклом исследований и тестов",
          "нахожу и проверяю продуктовые улучшения через интервью и метрики",
          "работаю в связке с разработкой: предлагаю варианты реализации, согласовываю продуктовые решения с учётом технических ограничений и довожу макеты до прода",
        ],
      },
      {
        title: "сбер",
        subtitle: "intern → strategic designer",
        period: "декабрь 2022 –\nапрель 2025",
        bullets: [
          "исследовала пользователей и рынок, превращала выводы в продуктовые концепции",
          "проектировала пользовательские сценарии и интерфейсы для новых цифровых продуктов",
          "визуализировала продуктовые концепции для защит перед c-level",
        ],
      },
      {
        title: "lieu commun",
        subtitle: "communication designer · проектно",
        period: "2023",
        bullets: [
          "коммуникационный дизайн для horeca",
          "работала с дизайн-системами, собирала новые",
        ],
      },
      {
        title: "relate",
        // «проектно» снимает вопрос о нахлёсте периодов: 2023 идёт внутри
        // сбера, и без пометки это читается как две параллельные штатные работы
        subtitle: "разработчик · проектно",
        period: "2023",
        bullets: [
          "разработка на webflow",
          // аббревиатуры развёрнуты: «ям» читалось как слово, а не как метрика
          "аналитика: google analytics, яндекс метрика, google tag manager",
        ],
      },
    ],
  },
  {
    label: "образование",
    entries: [
      {
        title: "ниу вшэ",
        // степень отдельной строкой: формальные фильтры (и в ats, и у эйчара
        // глазами) ищут именно слово «бакалавр», а не название программы
        subtitle:
          "бакалавр дизайна\nкоммуникационный дизайн → дизайн и программирование → дизайн и продвижение цифрового продукта",
        period: "2021–2025",
      },
      {
        title: "распределённый лицей вшэ",
        subtitle: "дизайн",
        period: "2019–2021",
      },
    ],
  },
  {
    label: "выступления",
    entries: [
      {
        title: "спикер международного экономического форума kazanforum",
        subtitle: "цифровой дизайн",
        period: "2024",
      },
    ],
  },
  {
    label: "дополнительно",
    entries: [
      {
        title: "дизайн-волонтёрство",
        subtitle: "приют в печатниках",
        period: "2025",
      },
      // без пометки о результате конкурсные строчки читаются как «участвовала»
      { title: "hse creative open / цифровой продукт", subtitle: "шортлист", period: "2024" },
      { title: "выбор dafes. июнь", subtitle: "шортлист", period: "2024" },
    ],
  },
  {
    label: "скиллы",
    // порядок групп — по убыванию того, что спрашивают на продуктовой вакансии:
    // сначала что умею, потом чем делаю, и только в конце смежное
    notes: [
      {
        text: "Интерфейсы, прототипирование, исследование пользователей, юзабилити-тестирование, JTBD, User Flow, дизайн-системы",
      },
      {
        text: "Figma, FigJam, ProtoPie, Miro, AI Tools",
      },
      {
        text: "HTML, CSS, JavaScript, React, Git, p5.js, Webflow, Readymag",
      },
      {
        text: "Яндекс Метрика, Google Analytics, Google Tag Manager, Excel",
      },
      {
        text: "Photoshop, Illustrator, InDesign, FontLab, After Effects, Cinema 4D, Blender",
      },
      {
        text: "Keynote, PowerPoint, think-cell",
      },
    ],
  },
];

// текст с переносами: \n → <br>, попутно неразрывные пробелы (как в кейсах)
function withBreaks(text: string) {
  return typo(text)
    .split("\n")
    .map((line, i) => (
      <Fragment key={i}>
        {i > 0 && <br />}
        {line}
      </Fragment>
    ));
}

function withoutBreaks(text: string) {
  return typo(text.replace(/\n/g, " "));
}

// пункт: текстовая часть в первой колонке, период — во второй, у правого края
function EntryView({ entry }: { entry: Entry }) {
  return (
    <div className={`cv__entry${entry.bullets ? " cv__entry--with-bullets" : ""}`}>
      <div className="cv__entry-text">
        <div className="cv__entry-heading">
          {/* место работы / вуз / пункт — h3 внутри своего раздела */}
          <h3 className="cv__entry-title">{withBreaks(entry.title)}</h3>
          {entry.subtitle && (
            <p className="cv__entry-sub">{withBreaks(entry.subtitle)}</p>
          )}
        </div>
        {entry.bullets && (
          <ul className="cv__bullets">
            {entry.bullets.map((item, i) => (
              <li className="cv__bullet" key={i}>
                <span className="cv__dot" aria-hidden="true" />
                <span>{withBreaks(item)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {entry.period && <p className="cv__period">{withoutBreaks(entry.period)}</p>}
    </div>
  );
}

export function CvPage() {
  const navRef = useRef<HTMLDivElement>(null);
  const [stickyNavVisible, setStickyNavVisible] = useState(false);

  useEffect(() => {
    const before = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = before;
    };
  }, []);

  useEffect(() => {
    const updateStickyNav = () => {
      const nav = navRef.current;
      if (!nav) return;
      setStickyNavVisible(nav.getBoundingClientRect().bottom < 0);
    };

    updateStickyNav();
    window.addEventListener("scroll", updateStickyNav, { passive: true });
    window.addEventListener("resize", updateStickyNav);
    return () => {
      window.removeEventListener("scroll", updateStickyNav);
      window.removeEventListener("resize", updateStickyNav);
    };
  }, []);

  return (
    <main className="cv-page">
      {/* «назад» слева, «скачать» справа — как «назад» в кейсах. на узких
         экранах становятся обычной строкой над резюме (см. css) */}
      <div className="cv__nav" ref={navRef}>
        <Link className="cv__back" to="/">
          ← назад
        </Link>
        <a className="cv__download" href={CV_FILE} download={CV_FILENAME}>
          скачать
        </a>
      </div>

      <nav
        className={`cv__sticky-nav${stickyNavVisible ? " is-visible" : ""}`}
        aria-label="Навигация резюме"
      >
        <Link className="cv__sticky-home" to="/">
          <img
            className="cv__sticky-avatar"
            src="/avatar.jpeg"
            alt=""
            aria-hidden="true"
          />
          <span>{typo(MOBILE_NAME)}</span>
        </Link>
        <a className="cv__sticky-download" href={CV_FILE} download={CV_FILENAME}>
          скачать
        </a>
      </nav>

      <div className="cv">
        <div className="cv__content">
          {/* шапка: аватар · имя, ниже контакты · о себе — две строки той же
             сетки, чтобы контакты стояли ровно против абзаца */}
          <div className="cv__head">
            <div className="cv__row cv__row--intro">
              <div className="cv__label cv__label--avatar">
                <img className="cv__avatar" src="/avatar.jpeg" alt="Карина Р." />
              </div>
              <div className="cv__body">
                <h1 className="cv__name">
                  <span className="cv__name-full">{withBreaks(NAME)}</span>
                  <span className="cv__name-short" aria-hidden="true">
                    {typo(MOBILE_NAME)}
                  </span>
                </h1>
                <p className="cv__mobile-role" aria-hidden="true">
                  {typo(ROLE)}
                </p>
              </div>
            </div>
            <div className="cv__row">
              {/* каждый контакт — своя строка (блочная ссылка, а не <br>):
                  так строку с адресом сайта можно спрятать с экрана целиком,
                  не оставив пустой строки от разделителя */}
              <p className="cv__label cv__label--contacts">
                {CONTACTS.map((contact) => (
                  <a
                    key={contact.href}
                    className={`cv__contact${contact.printOnly ? " cv__contact--print" : ""}`}
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {contact.label}
                  </a>
                ))}
              </p>
              <div className="cv__body">
                <p className="cv__about">{withBreaks(ABOUT)}</p>
              </div>
            </div>
          </div>

          {SECTIONS.map((section) => (
            <section className="cv__row" key={section.label}>
              {/* названия разделов резюме — h2 под h1 с именем: и для
                  скринридера, и для парсеров ats это структура документа */}
              <h2 className="cv__label cv__section-title">
                {typo(section.label)}
              </h2>
              <div className="cv__body">
                {section.entries && (
                  <div className="cv__entries">
                    {section.entries.map((entry) => (
                      <EntryView entry={entry} key={entry.title} />
                    ))}
                  </div>
                )}
                {section.notes && (
                  <div className="cv__notes">
                    {section.notes.map((note, i) => (
                      <p className="cv__note" key={i}>
                        {withBreaks(note.text)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
