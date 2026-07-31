import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteFooter } from "./SiteChrome";
import { typo } from "../lib/typo";
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

// раздел: название слева, справа либо пункты, либо абзацы (скиллы)
type Section = { label: string; entries?: Entry[]; notes?: string[] };

const NAME = "карина\nрамазанова";

const CONTACTS = ["@okonnaya", "carina.rama@ya.ru"];

const ABOUT =
  "продуктовый дизайнер с опытом создания сложных цифровых решений. люблю, когда дизайн не только решает задачи, но и выглядит классно. кодила до появления chatgpt";

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
          "визуал для c-level’a и правительства",
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
        subtitle: "разработчик",
        period: "2023",
        bullets: ["разработка на webflow", "ga, ям, gtm"],
      },
    ],
  },
  {
    label: "образование",
    entries: [
      {
        title: "ниу вшэ",
        subtitle:
          "коммуникационный дизайн → дизайн и программирование → дизайн и продвижение цифрового продукта",
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
        title: "участник международного экономического форума kazanforum",
        subtitle: "цифровой дизайн",
        period: "2024",
      },
    ],
  },
  {
    label: "дополнительно",
    entries: [
      {
        title: "дизайн-волонтерство",
        subtitle: "приют в печатниках",
        period: "2025",
      },
      { title: "hse creative open / цифровой продукт", period: "2024" },
      { title: "выбор dafes. июнь", period: "2024" },
    ],
  },
  {
    label: "скиллы",
    notes: [
      "интерфейсы, прототипирование, юзабилити-тестирование, атомарный подход, jtbd, userflow, анимация, дизайн-системы, исследование пользователей",
      "figma, photoshop, indesign, after effects, illustrator, ai tools, fontlab, readymag, webflow, miro, figjam, яндекс метрика, google analytics, google tag manager (gtm), excel, powerpoint, keynote, think-cell, cinema 4d (c4d), blender, spark ar, html, css, javascript, react, git, p5.js, protopie",
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
        <p className="cv__entry-title">{withBreaks(entry.title)}</p>
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
                <img className="cv__avatar" src="/avatar.jpg" alt="Карина Р." />
              </div>
              <div className="cv__body">
                <h1 className="cv__name">{withBreaks(NAME)}</h1>
              </div>
            </div>
            <div className="cv__row">
              <p className="cv__label cv__label--contacts">
                {CONTACTS.map((line, i) => (
                  <Fragment key={line}>
                    {i > 0 && <br />}
                    {line}
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
              <p className="cv__label">{typo(section.label)}</p>
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
                        {withBreaks(note)}
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
