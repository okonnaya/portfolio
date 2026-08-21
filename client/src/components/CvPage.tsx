import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteFooter } from "./SiteChrome";
import { typo } from "../lib/typo";
import {
  EMAIL,
  EMAIL_URL,
  SITE_LABEL,
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

// контакты — кликабельные: телеграм ведёт в чат, почта открывает письмо.
// в cv.pdf ссылки остаются рабочими (chrome сохраняет их при печати)
// адрес портфолио первым: cv.pdf пересылают отдельно от ссылки, и без него
// из файла не попасть в кейсы. пока SITE_URL пуст (см. lib/contacts.ts),
// строки просто нет — пустая ссылка хуже её отсутствия
const CONTACTS: { label: string; href: string }[] = [
  ...(SITE_URL ? [{ label: SITE_LABEL, href: SITE_URL }] : []),
  { label: TELEGRAM_HANDLE, href: TELEGRAM_URL },
  { label: EMAIL, href: EMAIL_URL },
];

const ABOUT =
  "продуктовый дизайнер с опытом создания сложных цифровых решений. люблю, когда дизайн не только решает задачи, но и выглядит классно. писала код до появления chatgpt :)";

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
          "отвечаю за весь дизайн двух внутренних продуктов в соло",
          "унифицировала ии-фичи: внедрение сократилось с 3 до 1 спринта, дизайн полностью исключён из этого процесса",
          "запускала новый ai-продукт",
          "вела редизайн продукта с полным циклом исследований и тестов",
        ],
      },
      {
        title: "сбер",
        subtitle: "intern → strategic designer",
        period: "декабрь 2022 –\nапрель 2025",
        bullets: [
          "интерфейсы и флоу для концептов и их защиты",
          "исследовала пользователей и рынок",
          "визуал для c-level’а и правительства",
          "работа с gen ai",
          "визуализация данных",
        ],
      },
      {
        title: "lieu commun",
        subtitle: "communication designer",
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
        text: "интерфейсы, прототипирование, юзабилити-тестирование, исследование пользователей, jtbd, userflow, атомарный подход, дизайн-системы",
      },
      {
        text: "figma, figjam, protopie, miro, photoshop, illustrator, indesign, fontlab, ai tools",
      },
      { text: "яндекс метрика, google analytics, google tag manager, excel" },
      { text: "html, css, javascript, react, git, p5.js, webflow, readymag" },
      { text: "after effects, cinema 4d, blender, spark ar" },
      { text: "keynote, powerpoint, think-cell" },
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

// пункт: текстовая часть в первой колонке, период — во второй, у правого края
function EntryView({ entry }: { entry: Entry }) {
  return (
    <div className="cv__entry">
      <div className="cv__entry-text">
        {/* место работы / вуз / пункт — h3 внутри своего раздела */}
        <h3 className="cv__entry-title">{withBreaks(entry.title)}</h3>
        {entry.subtitle && (
          <p className="cv__entry-sub">{withBreaks(entry.subtitle)}</p>
        )}
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
      {entry.period && <p className="cv__period">{withBreaks(entry.period)}</p>}
    </div>
  );
}

export function CvPage() {
  useEffect(() => {
    const before = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = before;
    };
  }, []);

  return (
    <main className="cv-page">
      {/* «назад» слева, «скачать» справа — как «назад» в кейсах. на узких
         экранах становятся обычной строкой над резюме (см. css) */}
      <div className="cv__nav">
        <Link className="cv__back" to="/">
          ← назад
        </Link>
        <a className="cv__download" href={CV_FILE} download={CV_FILENAME}>
          скачать
        </a>
      </div>

      <div className="cv">
        <div className="cv__content">
          {/* шапка: аватар · имя, ниже контакты · о себе — две строки той же
             сетки, чтобы контакты стояли ровно против абзаца */}
          <div className="cv__head">
            <div className="cv__row">
              <div className="cv__label cv__label--avatar">
                <img className="cv__avatar" src="/avatar.jpeg" alt="Карина Р." />
              </div>
              <div className="cv__body">
                <h1 className="cv__name">{withBreaks(NAME)}</h1>
              </div>
            </div>
            <div className="cv__row">
              <p className="cv__label cv__label--contacts">
                {CONTACTS.map((contact, i) => (
                  <Fragment key={contact.href}>
                    {i > 0 && <br />}
                    <a
                      className="cv__contact"
                      href={contact.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {contact.label}
                    </a>
                  </Fragment>
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
              <h2 className="cv__label">{typo(section.label)}</h2>
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
