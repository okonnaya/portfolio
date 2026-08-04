import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SiteFooter, SiteHeader } from "./SiteChrome";
import { NotFound } from "./NotFound";
import { LazyVideo } from "./LazyVideo";
import { typo } from "../lib/typo";
import { isVideoSrc } from "../lib/media";
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

// ряд блока процесса: либо «шаг (лево) · описание (право)», либо вставка медиа
// между шагами — чтобы картинка стояла ровно после того шага, к которому
// относится, не разрывая блок процесса на два
type StepRow = { label: string; text: string } | { media: MediaItem[] };

// «роль · команда · срок» под заголовком кейса: с чем именно пришёл автор в этот
// проект. period необязателен — строка собирается только из заполненных частей,
// чтобы не выводить пустые разделители
type CaseMeta = { role: string; team: string; period?: string };

type Block =
  // секция «название (лево) · описание (право)». lead — крупный заголовок кейса,
  // и только он несёт meta-строку
  | { block: "section"; label: string; lead?: boolean; meta?: CaseMeta; body: Body }
  // одиночное медиа во всю ширину колонки
  | ({ block: "media" } & MediaItem)
  // группа медиа, идущих подряд: несколько картинок в одном блоке с меньшим
  // гэпом между собой, чем между крупными блоками страницы
  | { block: "group"; items: MediaItem[] }
  // блок процесса: несколько тесных рядов «шаг (лево) · описание (право)».
  // label — как блок называется в оглавлении (по умолчанию «процесс»)
  | { block: "steps"; label?: string; rows: StepRow[] };

// disclaimer — сноска в конце кейса. Нужна там, где показан интерфейс рабочего
// продукта: подписывает, что на картинках не боевые экраны и не настоящие
// пользователи. Поле опциональное — в личных проектах показывать нечего и
// нечего оговаривать
type Case = { title: string; disclaimer?: string; blocks: Block[] };

// одна формулировка на все рабочие кейсы: расходиться по смыслу они не должны,
// а исправлять текст в одном месте проще, чем в трёх
const NDA_NOTE =
  "все имена, данные и цифры на изображениях выдуманы, интерфейсы изменены. боевые экраны продуктов и данные реальных пользователей не показаны";

const CASES: Record<string, Case> = {
  "ai-component": {
    title: "ии-решение в b2e продуктах",
    disclaimer: NDA_NOTE,
    blocks: [
      {
        block: "section",
        lead: true,
        label: "ии-решение в b2e продуктах",
        // TODO срок: подставьте период работы над кейсом (напр. «2025»);
        // пока строка собирается только из роли и команды
        meta: { role: "продуктовый дизайнер" },
        body: {
          bullets: [
            "запуск ии-фич сократился с 3 спринтов до 1 — дизайн и большинство UX-согласований исключены из процесса",
            "в проде на 7+ продуктах",
          ],
        },
      },
      { block: "media", src: "/case1.svg", caption: "зафиксировала гайдлайны и собрала сквозной компонент AI-чата для внутренних продуктов на одной дизайн-системе. решение встраивается в любой продукт без участия дизайнера и не ломает существующие UX-паттерны",  align: "right" },
      {
        block: "section",
        label: "контекст",
        body: {
          bullets: [
            "десяток внутренних продуктов на единой дизайн-системе с разными задачами, лейаутами и паттернами использования",
            "в 4-х из них уже были ИИ-фичи",
            "есть продукты, где нет штатного дизайнера и внедрение происходит только разработкой и менеджерами",
          ],
        },
      },
      {
        block: "section",
        label: "проблемы",
        body: {
          bullets: [
            "пользователь теряется, переходя между продуктами: разное расположение, поведение, вид чата",
            "существующие решения выглядят и работают по-разному",
            "без единого стандарта каждый продукт внедряет ии по-своему, и часть решений просто вредит пользователю",
            "растянутый t2m из-за количества согласований",
          ],
        },
      },
      { block: "media", src: "/case1_1.png" },
      {
        block: "steps",
        rows: [
          {
            label: "бенчмаркинг",
            text: "как устроены AI-виджеты у нас и вне, разбор существующих исследований индустрии. выделила 2 сценария: глобальный и контекстный",
          },
          {
            label: "аудит текущих решений",
            text: "точки входа, поведение, метрики",
          },
          {
            label: "качественное исследование",
            text: "8 респондентов, пользователей уже существующих ии-фич во внутренних продуктах",
          },
          {
            label: "разработка и сборка гайдов",
            text: "пиксели туда-сюда, lottie-анимации экспорт-импорт, формулировки текстов под перечитывание Ильяхова, двиганье точек входа, поиск незанятого, но удобного шортката",
          },
          {
            label: "продуктовая защита",
            text: "согласование с десятком менеджеров всех продуктов, разработкой и топ-менеджментом бизнес-юнита",
          },
        ],
      },
      { block: "media", src: "/case1_2.png" },
      {
        block: "section",
        label: "решение",
        body: {
          text: "компонент и гайд, который покрывает глобальный и контекстные флоу, ложится на существующие паттерны продуктов, внедряется командой продукта самостоятельно, без дизайнера",
        },
      },
      {
        block: "section",
        label: "результат",
        body: {
          bullets: [
            "3 спринта → 1 спринт на запуск AI-виджета в продукте, из процесса исключена дизайн-часть — компонент готов к использованию из коробки",
            "в проде на 7+ продуктах",
            "гипотезы проверены на интервью",
            "согласовано с менеджерами продуктов и топ-менеджментом бизнес-юнита без блокеров",
          ],
        },
      },
      { block: "group", items: [
  { src: "/case1_3.png" },
  { src: "/case1_4.png" },
]},
    ],
  },

  "search-button": {
    title: "улучшение поиска",
    disclaimer: NDA_NOTE,
    blocks: [
      {
        block: "section",
        lead: true,
        label: "улучшение поиска",
        // TODO срок: подставьте период работы над кейсом (напр. «2025»);
        // пока строка собирается только из роли и команды
        meta: { role: "продуктовый дизайнер"},
        body: {
          bullets: [
            "+4,19 п.п. к переходам на страницу поиска после проактивной UX-правки",
          ],
        },
      },
      {
        block: "media",
        src: "/case3_2.png",
        caption:
          "инициировала изменение после пользовательского интервью — без постановки от менеджера. гипотеза подтвердилась: кнопка поиска в инпуте сделала полную выдачу заметнее, не повлияв на существующий сценарий через Enter",
        align: "right",
      },
      {
        block: "section",
        label: "контекст",
        body: {
          bullets: [
            "присутствовала на продуктовом интервью пользователей поиска",
            "один из респондентов не переходил на страницу полной выдачи — изучал только саджест",
            "кнопку перехода под саджестом не замечал",
          ],
        },
      },
      {
        block: "section",
        label: "гипотеза",
        body: {
          text: "не у всех пользователей сформирован паттерн нажимать Enter после ввода запроса. из-за этого часть аудитории вообще не узнаёт о существовании страницы полной выдачи",
        },
      },
      {
        block: "section",
        label: "решение",
        body: {
          text: "добавила кнопку поиска в конец поисковой строки. сценарий с Enter сохранился, появился дополнительный очевидный способ перейти к результатам поиска",
        },
      },
       { block: "media", src: "/case3_3.png" },
      {
        block: "section",
        label: "результат",
        body: {
          bullets: [
            "переходы на страницу поиска: 57,05% → 61,24% (+4,19 п.п.)",
            "существующий сценарий через Enter не изменился в метриках",
            "гипотеза подтвердилась: обнаруживаемость полной выдачи выросла",
          ],
        },
      },
    ],
  },

  "ai-research-platform": {
    title: "ai research\nplatform",
    disclaimer: NDA_NOTE,
    blocks: [
      {
        block: "section",
        lead: true,
        label: "ai research\nplatform",
        // TODO срок: подставьте период работы над кейсом (напр. «2025»);
        // пока строка собирается только из роли и команды
        meta: { role: "соло-дизайнер", team: "крупная российская компания" },
        body: {
          bullets: [
            "концепция утверждена топ-менеджментом с первой защиты",
            "проект ушёл в разработку",
          ],
        },
      },
 { block: "media", src: "/test.webm", caption: "концепт цифровой платформы для ai-ресёрчеров и бизнеса в одной из крупнейших российских компаний. соло-дизайнер: ресёрч, проработка ключевых сценариев",  align: "right" },

      {
        block: "section",
        label: "контекст",
        body: {
          bullets: [
            "крупная российская компания с активным r&d",
            "ai-ресёрчеры и бизнес работают разрозненно, без общего инструмента",
          ],
        },
      },
      {
        block: "section",
        label: "проблема",
        body: {
          bullets: [
            "учёные и бизнес не могут найти друг друга — нет общей точки входа",
            "нет единого места, как google scholar, но внутри компании — исследования не индексируются и теряются",
            "бизнес и учёные дублируют работу, потому что не видят, что уже сделано, — включая неудачные попытки",
            "готовые исследования не переиспользуются после завершения",
            "ресёрчеры не могут найти поддержку бизнеса для своих инициатив",
            "→ ресурсы компании тратятся неэффективно",
          ],
        },
      },
      { block: "media", src: "/case2_3.png" },
      {
        block: "steps",
        rows: [
          {
            label: "бенчмаркинг",
            text: "три направления: kss, crm, showcase",
          },
          {
            label: "сценарии",
            text: "4 юзер сториза: бизнес, менеджер, учёный, внешний учёный",
          },
          {
            label: "проектирование",
            text: "интерфейс ключевых страниц по сценариям",
          },
          {
            label: "защита",
            text: "проект ушёл в разработку после защиты перед топ-менеджментом",
          },
        ],
      },
       { block: "media", src: "/case2_2.png" },
      {
        block: "section",
        label: "решение",
        body: {
          text: "цифровая платформа, объединяющая функции crm, kss и showcase. человекоцентричная — ресёрч делают реальные люди — и с фокусом на коллаборацию исследователей с бизнесом",
        },
      },
      {
        block: "section",
        label: "результат",
        body: {
          bullets: [
            "концепция утверждена топ-менеджментом",
            "проект ушёл в разработку",
          ],
        },
      },
            { block: "group", items: [
  { src: "/case2_4.png" },
  { src: "/case2_5.png" },
  { src: "/case2_6.png" },
]},
    ],
  },

  "emotions-space": {
    title: "пространство\nдля сохранения эмоций",
    blocks: [
      {
        block: "section",
        lead: true,
        label: "пространство\nдля сохранения эмоций",
        // TODO срок: подставьте период работы над кейсом (напр. «2025»);
        // пока строка собирается только из роли и команды
        meta: { role: "соло: ресёрч, продукт, дизайн", team: "личный проект" },
        body: {
          bullets: [
            "от исследования эмоциональных привычек пользователей до mvp цифрового продукта",
            "80+ пользователей, 50+ активных, 5 первых платящих",
          ],
        },
      },
      {
        block: "media",
        src: "/case4_1.png",
        
      },
      {
        block: "section",
        label: "контекст",
        body: {
          bullets: [
            "большинство цифровых сервисов помогают справляться с негативными эмоциями, но почти не помогают замечать и сохранять позитивные моменты",
            "при этом негативные мысли запоминаются лучше, постепенно накапливаются и влияют на эмоциональное состояние человека",
          ],
        },
      },
      {
        block: "media",
        src: "/bubble/01-problem.webp",
        caption:
          "негативные мысли самоподкрепляются и усиливают тревожность, а хорошие моменты почти не фиксируются",
      },
      {
        block: "section",
        label: "гипотеза",
        body: {
          text: "можно создать цифровое пространство, которое помогает сохранять положительные эмоции и постепенно формировать привычку замечать хорошее",
        },
      },
      { block: "media", src: "/bubble/02-good-shit-happens.webp" },
      {
        block: "steps",
        label: "исследование",
        rows: [
          {
            label: "количественное\nисследование",
            text: "130 респондентов, 19 вопросов. изучила отношение людей к собственным эмоциям, привычки их фиксировать и существующие способы заботы о своём эмоциональном состоянии",
          },
          {
            label: "трендвотчинг",
            text: "проанализировала современные поведенческие тренды и выделила три направления, которые легли в основу продукта: tribalism — людям важно ощущать принадлежность и эмоциональную безопасность; simplicity — специализированные продукты выигрывают у универсальных; experience — люди стали осознаннее относиться к собственному состоянию и эмоциональному опыту",
          },
          {
            label: "анализ рынка",
            text: "изучила существующие решения и свободные ниши: конкурентный анализ, pestel, бенчмаркинг",
          },
          { media: [
            // выключенные картинки перенесены в assets-src/unused/bubble/ —
            // в public они только весили; вернёте строки, вернёте и файлы
            // { src: "/bubble/03-interviews.webp", caption: "цели и структура глубинных интервью", align: "right" },
            // { src: "/bubble/04-audience.webp", caption: "портрет аудитории: контекст, задача, сложность" },
            { src: "/bubble/05-competitors.webp"},
          ]},
          {
            label: "качественное\nисследование",
            text: "30 глубинных интервью: как люди проживают эмоции, какие инструменты используют, что помогает им чувствовать себя лучше и почему существующие решения не становятся частью повседневной жизни. разделила ЦА на 3 сегмента",
          },
          { media: [
            { src: "/bubble/06-persona-anxious.webp" },
            { src: "/bubble/07-persona-friends.webp" },
            { src: "/bubble/08-persona-creatives.webp" },
          ]},
        ],
      },
      {
        block: "section",
        label: "инсайты",
        body: {
          bullets: [
            "негативные события люди запоминают значительно лучше позитивных",
            "хорошие моменты редко сохраняются осознанно",
            "большинство сервисов воспринимаются как дневники или инструменты «для проблем»",
            "пользователи готовы пользоваться подобным продуктом только если взаимодействие занимает несколько секунд",
          ],
        },
      },
      
      {
        block: "section",
        label: "решение",
        body: {
          bullets: [
            "цифровое пространство, которое помогает замечать, сохранять и возвращаться к своим положительным эмоциям",
            "быстрое сохранение эмоции — за несколько секунд",
            "личное пространство воспоминаний",
            "ненавязчивое формирование привычки",
            "простой интерфейс без ощущения ведения дневника",
          ],
        },
      },
      {
        block: "media",
        src: "/bubble/128.webp"
      },
      { block: "media", src: "/bubble/10-save-closeup.webp" },
      { block: "group", items: [
        { src: "/bubble/11-scenarios.webp" },
        { src: "/bubble/190.webp" },
        { src: "/bubble/189.webp" },
      ]},
        {
        block: "section",
        label: "фичи",
        body: {
          bullets: [
            "круги общения: у людей есть 2–3 круга, с которыми они готовы делиться разным контентом",
            "уведомления по времени — под собственную привычку, а не под чужую активность",
            "подбадривания о прогрессе: бережные напоминания без укора за пропуски",
          ],
        },
      },
      { block: "media", src: "/bubble/14-design-system.webp", caption: "дизайн-система продукта", align: "right" },
      {
        block: "section",
        label: "бизнес-модель",
        body: {
          bullets: [
            "монетизация — подписка: полная аналитика эмоций и дополнительные виды импорта контента из соцсетей",
            "каналы привлечения: яндекс директ и вк реклама",
            "экономика сходится при apc > 2 и конверсии > 2%",
          ],
        },
      },
      { block: "group", items: [
        { src: "/bubble/15-market.webp" },
        { src: "/bubble/16-unit-economics.webp"},
        { src: "/bubble/17-metrics-tree.webp"},
      ]},
      {
        block: "steps",
        label: "mvp",
        rows: [
          {
            label: "лендинг",
            text: "проверила ценностное предложение и интерес аудитории до разработки полноценного продукта",
          },
          { media: [
            { src: "/bubble/18-landing.webp" },
          ]},
          {
            label: "лид-магнит\nи реклама",
            text: "запустила рекламную кампанию и оценила готовность пользователей оставить контакт",
          },
          { media: [
            { src: "/bubble/19-lead-magnet.webp" },
            { src: "/bubble/20-lead-magnet-metrics.webp" },
            { src: "/bubble/21-ad-campaigns.webp" },
          ]},
          {
            label: "telegram-бот",
            text: "собрала mvp основной механики. он позволил проверить, готовы ли пользователи регулярно фиксировать положительные эмоции без полноценного приложения",
          },
          { media: [
            { src: "/bubble/22-bot.webp" },
            { src: "/bubble/23-digest.webp" },
          ]},
        ],
      },
      {
        block: "section",
        label: "результат",
        body: {
          bullets: [
            "55 859 — общий охват рекламной кампании",
            "22,8% — конверсия из клика в контакт",
            "80+ зарегистрированных пользователей",
            "50+ активных пользователей",
            "5 первых платящих пользователей",
            "гипотеза подтвердилась: пользователи готовы возвращаться в сервис и использовать простую механику сохранения положительных эмоций даже в формате mvp",
          ],
        },
      },
      {
        block: "media",
        src: "/bubble/24-funnel.webp",
        align: "right",
      },
     
    ],
  },
};

// текст с переносами: \n в строке → <br>. попутно расставляем неразрывные
// пробелы (typo), чтобы предлоги и союзы не висели в конце строк
function withBreaks(text: string) {
  return typo(text).split("\n").map((line, i) => (
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

// одна единица медиа: картинка/видео (или розовый плейсхолдер) + опциональная
// подпись. .webm/.mp4 рендерятся как автоплей-видео, всё остальное — как img
function MediaView({ item }: { item: MediaItem }) {
  const isVideo = isVideoSrc(item.src);
  return (
    <div className="case__media">
      {item.src ? (
        isVideo ? (
          <LazyVideo
            className={`case__img${item.tall ? " case__img--tall" : ""}`}
            src={item.src}
          />
        ) : (
          <img
            className={`case__img${item.tall ? " case__img--tall" : ""}`}
            src={item.src}
            alt={item.caption ?? ""}
            // страница кейса — длинная лента медиа; без lazy браузер тянет все
            // картинки сразу, хотя видно от них один-два экрана
            loading="lazy"
          />
        )
      ) : (
        <div className={`case__ph${item.tall ? " case__ph--tall" : ""}`} />
      )}
      {item.caption && (
        <p className={`case__caption case__caption--${item.align ?? "left"}`}>
          {withBreaks(item.caption)}
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
        {block.rows.map((row, i) =>
          "media" in row ? (
            <div className="case__group case__steps-media" key={i}>
              {row.media.map((item, j) => (
                <MediaView item={item} key={j} />
              ))}
            </div>
          ) : (
            <div className="case__row" key={i}>
              <p className="case__label">{withBreaks(row.label)}</p>
              <div className="case__body">
                <p className="case__text">{withBreaks(row.text)}</p>
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  // у заголовка кейса под названием идёт строка «роль · команда · срок».
  // label и она живут в одной обёртке: .case__row — сетка в две колонки, и
  // третий прямой ребёнок уехал бы во второй ряд, под название
  if (block.lead) {
    return (
      <div className="case__row" id={id}>
        <div className="case__lead">
          {/* название кейса — h1 страницы: до этого вся страница шла без
             единого заголовка, и парсеры видели плоскую простыню абзацев */}
          <h1 className="case__label case__label--lead">
            {withBreaks(block.label)}
          </h1>
          {block.meta && <CaseMetaLine meta={block.meta} />}
        </div>
        <div className="case__body">
          <BodyView body={block.body} />
        </div>
      </div>
    );
  }

  // названия секций («контекст», «проблемы», «результат») — h2 под h1 кейса:
  // это те же пункты, что и в оглавлении справа
  return (
    <div className="case__row" id={id}>
      <h2 className="case__label">{withBreaks(block.label)}</h2>
      <div className="case__body">
        <BodyView body={block.body} />
      </div>
    </div>
  );
}

// «роль · команда · срок» — собирается только из заполненных частей, чтобы не
// оставлять висящих разделителей, когда срок ещё не указан
function CaseMetaLine({ meta }: { meta: CaseMeta }) {
  const parts = [meta.role, meta.team, meta.period].filter(Boolean) as string[];
  if (!parts.length) return null;
  return (
    <p className="case__meta">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="case__meta-sep" aria-hidden="true"> · </span>}
          {typo(part)}
        </Fragment>
      ))}
    </p>
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
      items.push({ id: `sec-${i}`, label: block.label ?? "процесс" });
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
          {typo(it.label)}
        </a>
      ))}
    </nav>
  );
}

/**
 * Порядок кейсов — тот же, в котором они идут на главной (продуктовые, потом
 * «для души»). Нужен для перехода «следующий кейс →»: Record выше порядок не
 * гарантирует, а читателю кейса логично предложить следующий, а не отправлять
 * его назад на главную. Список закольцован: после последнего — первый.
 */
const CASE_ORDER = [
  "ai-component",
  "search-button",
  "ai-research-platform",
  "emotions-space",
] as const;

function nextCase(slug: string) {
  const i = CASE_ORDER.indexOf(slug as (typeof CASE_ORDER)[number]);
  if (i === -1) return null;
  const next = CASE_ORDER[(i + 1) % CASE_ORDER.length];
  // сам на себя не ссылаемся (если кейс в проекте остался один)
  if (next === slug) return null;
  const data = CASES[next];
  return data ? { slug: next, title: data.title } : null;
}

export function CasePage() {
  const { slug = "" } = useParams();
  const data = CASES[slug];
  const items = data ? tocItems(data.blocks) : [];
  const ids = data ? anchorIds(data.blocks) : {};
  const next = data ? nextCase(slug) : null;

  // неизвестный slug — это не «кейс без контента», а несуществующий адрес:
  // отдаём ту же 404, что и на любом другом непонятном пути
  if (!data) return <NotFound />;

  return (
    <main className="case-page">
      <SiteHeader />

      <div className="case">
        <Link className="case__back" to={`/#case-${slug}`}>
          ← назад
        </Link>

        <CaseToc items={items} />

        <div className="case__content">
          {data.blocks.map((block, i) => (
            <BlockView key={i} block={block} id={ids[i]} />
          ))}
        </div>

        {/* сноска про содержимое картинок — после кейса, но до перехода на
            следующий: это подпись именно к этой странице */}
        {data.disclaimer && (
          <p className="case__disclaimer">{withBreaks(data.disclaimer)}</p>
        )}

        {next && (
          <Link className="case__next" to={`/case/${next.slug}`}>
            <span className="case__next-label">следующий кейс</span>
            <span className="case__next-title">
              {withBreaks(next.title)} <span aria-hidden="true">→</span>
            </span>
          </Link>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
