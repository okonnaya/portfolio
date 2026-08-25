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

// тело секции: буллиты, колонка или абзац текста. intro — строка-зачин над
// списком («отвечала за»), от которой буллиты грамматически продолжаются: без
// неё пункты в винительном падеже читаются как обрубки.
// column — те же пункты, но точка не помечает каждый из них, а стоит между
// ними: пункты читаются как самостоятельные утверждения, а не как перечисление,
// продолжающее общий зачин
type Body =
  | { bullets: string[]; intro?: string }
  | { column: string[] }
  | { text: string };

// одна единица медиа. src — картинка (путь от корня, напр. /case1_1.png); без
// неё показывается розовый плейсхолдер. tall — высокий блок. align — выключка
// подписи к центру: "left" (левая половина, текст вправо) — по умолчанию,
// "right" (правая половина, текст влево)
type MediaItem = { src?: string; tall?: boolean; caption?: string; align?: "left" | "right" };

// ряд блока процесса: либо «шаг (лево) · описание (право)», либо вставка медиа
// между шагами — чтобы картинка стояла ровно после того шага, к которому
// относится, не разрывая блок процесса на два
type StepRow = { label: string; text: string; sticky?: boolean } | { media: MediaItem[] };

// «роль · команда · срок» под заголовком кейса: с чем именно пришёл автор в этот
// проект. period необязателен — строка собирается только из заполненных частей,
// чтобы не выводить пустые разделители
type CaseMeta = { role: string; team?: string; period?: string };

type Block =
  // секция «название (лево) · описание (право)». lead — крупный заголовок кейса,
  // и только он несёт meta-строку. sticky — название держится у верха экрана,
  // пока мимо него едет тело: имеет смысл там, где описание длинное, поэтому
  // включается точечно, а не по умолчанию
  | {
      block: "section";
      label: string;
      lead?: boolean;
      meta?: CaseMeta;
      sticky?: boolean;
      body: Body;
    }
  // одиночное медиа во всю ширину колонки
  | ({ block: "media" } & MediaItem)
  // группа медиа, идущих подряд: несколько картинок в одном блоке с меньшим
  // гэпом между собой, чем между крупными блоками страницы
  | { block: "group"; items: MediaItem[] }
  // блок процесса: несколько тесных рядов «шаг (лево) · описание (право)».
  // label — как блок называется в оглавлении (по умолчанию «процесс»)
  | { block: "steps"; label?: string; rows: StepRow[] }
  // хайлайт: отдельная инициатива, которая не тянет на кейс, но и не должна
  // растворяться в буллитах. Рисуется карточкой с рамкой — единственный блок
  // страницы, который выделен визуально, поэтому ставится точечно: рядом
  // стоящие карточки обесценивают выделение
  | {
      block: "highlight";
      eyebrow?: string;
      label: string;
      sticky?: boolean;
      // toc — вывести хайлайт пунктом оглавления. По умолчанию его там нет:
      // хайлайт — врезка сбоку от сюжета кейса, и в списке разделов он спорит
      // с секциями за внимание. Включается там, где инициатива тянет на
      // самостоятельный раздел
      toc?: boolean;
      // media — путь к ролику/картинке: она встаёт в левую колонку карточки, на
      // белой подложке (текст в хайлайте живёт в правой). без неё левая колонка
      // просто пустая
      media?: string;
      body: Body;
    }
  // вложенный кейс: внутри страницы продукта живёт отдельная история со своими
  // секциями. Рисуется на сером фоне (видно, где начинается и заканчивается
  // вложенность), а его секции попадают в оглавление вторым уровнем.
  // eyebrow — мелкая подпись над названием: подписывает, что это за врезка
  // («продуктовый кейс»), пока читатель не дошёл до заголовка
  | { block: "nested"; eyebrow?: string; label: string; body?: Body; blocks: Block[] };

// disclaimer — сноска в конце кейса. Нужна там, где показан интерфейс рабочего
// продукта: подписывает, что на картинках не боевые экраны и не настоящие
// пользователи. Поле опциональное — в личных проектах показывать нечего и
// нечего оговаривать
type Case = { title: string; disclaimer?: string; blocks: Block[] };

// одна формулировка на все рабочие кейсы: расходиться по смыслу они не должны,
// а исправлять текст в одном месте проще, чем в трёх
const NDA_NOTE =
  "все имена, данные и цифры на изображениях выдуманы, интерфейсы изменены. экраны продуктов и данные пользователей вымышленные";

const CASES: Record<string, Case> = {
  "ai-component": {
    title: "ai-ассистент\nв b2e",
    disclaimer: NDA_NOTE,
    blocks: [
      {
        block: "section",
        lead: true,
        label: "ai-ассистент\nв b2e",
        body: { text: "внутренний помощник\nдля корпоративной экосистемы" },
      },
      {
        block: "media",
        src: "/case1.png",
        caption:
          "внутренний AI-продукт: начинался как AI-фича внутри другого, а затем вырос в самостоятельного ассистента с возможностью интеграции в другие сервисы",
        align: "right",
      },
      {
        block: "section",
        label: "роль",
        body: {
          intro: "отвечала за",
          bullets: [
            "развитие продукта с момента запуска",
            "дизайн новых AI-возможностей по мере зрелости фичи и рынка (например, reasoning, agent mode)",
            "исследования и проверку гипотез, интервью, работу с аналитикой",
            "платформенные решения для масштабирования AI между продуктами",
          ],
        },
      },
           
      
      {
        block: "nested",
        eyebrow: "продуктовый кейс",
        label: "сквозной компонент",
        body: {
          text: "зафиксировала гайдлайны и собрала сквозной компонент AI-чата для внутренних продуктов на одной дизайн-системе. решение встраивается в любой продукт без участия дизайнера и не ломает существующие UX-паттерны",
        },
        blocks: [
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
        block: "highlight",
        label: "протащила анимашки <3",
        media: "/caseanimation.mp4",
        body: {
          column: [
            "цель — повысить заметность фичей и вовлечённость пользователей, обходя баннерную слепоту к привычной дизайн-системе. в b2e-продуктах ранее не было анимаций, для разработки подготавливала css и lottie",
          ],
        },
      },
          {
            block: "section",
            label: "проблемы",
            body: {
              bullets: [
                "AI-сценарии работают по-разному в разных продуктах — пользователю приходится каждый раз переучиваться",
                "каждая команда проектирует и внедряет решение заново, из-за чего растут сроки и количество согласований",
              ],
            },
          },
          { block: "media", src: "/case1_1.png" },

          {
            block: "steps",
            rows: [
              {
                label: "бенчмаркинг",
                text: "как устроены AI-виджеты у нас и вне, разбор существующих исследований индустрии. выделила 2 сценария: глобальный и контекстный",
              },
              {
                label: "аудит",
                text: "текущие точки входа, поведение, метрики",
              },
              {
                label: "качественное сследование",
                text: "8 респондентов, пользователей уже существующих ии-фич во внутренних продуктах",
              },
              {
                label: "разработка гайдов",
                text: "пиксели туда-сюда, lottie-анимации экспорт-импорт, формулировки текстов под перечитывание Ильяхова, двиганье точек входа, поиск незанятого, но удобного шортката",
              },
              {
                label: "продуктовая защита",
                text: "согласование с десятком менеджеров всех продуктов, разработкой и топ-менеджментом бизнес-юнита",
              },
            ],
          },
          { block: "media", src: "/case1_2.png" },
          {
            block: "section",
            label: "решение",
            body: {
              text: "компонент и гайд, который покрывает глобальный и контекстные флоу, ложится на существующие паттерны продуктов, внедряется командой продукта самостоятельно, без дизайнера",
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
                "согласовано с менеджерами продуктов и топ-менеджментом бизнес-юнита без блокеров",
              ],
            },
          },
          {
            block: "group",
            items: [{ src: "/case1_3.png" }, { src: "/case1_4.png" }],
          },
        ],
      },
    ],
  },

  "search-button": {
    title: "поисковой\nсервис",
    disclaimer: NDA_NOTE,
    blocks: [
      {
        block: "section",
        lead: true,
        label: "поисковой\nсервис",
        body: { text: "отдельный продукт\nи встраиваемое решение" },
      },
      {
        block: "media",
        src: "/case3_1.png",
        caption:
          "поиск живёт и как самостоятельный продукт, и как решение, встраиваемое в другие сервисы: строка с саджестом и страница полной выдачи",
        align: "right",
      },
      {
        block: "section",
        label: "роль",
        // TODO роль: перечислено только то, что раскрыто в кейсе ниже. если
        // в продукте были другие зоны ответственности — допишите их сюда
        body: {
          intro: "отвечала за",
          bullets: [
            "продуктовый дизайн сервиса",
            "участие в продуктовых интервью с пользователями поиска",
            "инициативные ux-правки без постановки от менеджера: от гипотезы до защиты",
            "проверку гипотез на метриках после релиза",
          ],
        },
      },
      {
        block: "nested",
        eyebrow: "продуктовый кейс",
        label: "кнопка поиска",
        body: {
          text: "инициировала изменение после пользовательского интервью, без постановки от менеджера: +4,19 п.п. к переходам на страницу полной выдачи",
        },
        blocks: [
          {
            block: "section",
            label: "контекст",
            body: {
              bullets: [
                "проводила интервью по фиче",
                "один из респондентов не переходил на страницу полной выдачи — изучал только саджест",
                "кнопку перехода под саджестом не замечал",
              ],
            },
          },
          {
            block: "highlight",
            label: "регулярные интервью",
            media: "/highlight1.jpg",
            body: {
              column: [
                "проблема обнаружилась во время интервью по другой фиче. исследования — лютый прикол: регулярно провожу интервью/опросы и смотрю метрики, чтобы находить проблемы, формулировать гипотезы и проверять",
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
          { block: "media", src: "/case3_2.png" },
          {
            block: "section",
            label: "результат",
            body: {
              bullets: [
                "переходы на страницу поиска: 57,05% → 61,24% (+4,19 п.п.)",
                "существующий сценарий через Enter не изменился в метриках",
              ],
            },
          },
          { block: "media", src: "/case3_3.png" },
        ],
      },
      {
        block: "highlight",
        label: "итоги года",
        media: "/highlight2.jpg",
        body: {
          column: [
            "инициировала новогодний прикол с поисковыми итогами. этот проект повысил узнаваемость бренда и посещаемость главной страницы сервиса, знатно пошумел во внутренних сервисах и познакомил бумеров со словом «друллеги»",
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
        // meta: { role: "соло-дизайнер", team: "крупная российская компания" },
        body: { text: "внутреннее решение\nдля коллаборации" },
      },
      {
        block: "media",
        src: "/test.webm",
        caption:
          "концепт цифровой платформы для ai-ресёрчеров и бизнеса: единая точка входа, где исследования видно, где их находят и переиспользуют",
        align: "right",
      },
      {
        block: "section",
        label: "роль",
        body: {
          intro: "отвечала за",
          bullets: [
            "весь дизайн-трек концепции в одиночку: от ресёрча до защиты",
            "исследование предметной области: как внутри компании устроена работа учёных и бизнеса",
            "ключевые пользовательские сценарии и интерфейс платформы",
            "защиту концепции перед топ-менеджментом",
          ],
        },
      },
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
       { block: "media", src: "/case2_3.png" },
      {
        block: "section",
        label: "проблема",
        body: {
          bullets: [
            "исследователи и бизнес не видят друг друга и уже существующие исследования",
            "из-за этого работа дублируется, результаты не переиспользуются, инициативам сложнее находить поддержку",
            "→ ресурсы компании тратятся неэффективно",
          ],
        },
      },
       { block: "media", src: "/case2_2.png" },
     
      {
        block: "steps",
        rows: [
          {
            label: "бенчмаркинг",
            text: "три направления: kss, crm, showcase",
          },
          {
            label: "сценарии",
            text: "4 ключевых пользовательских сценария: бизнес, менеджер, учёный, внешний учёный",
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
            "концепция утверждена топ-менеджментом с первой защиты",
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
    title: "архив\nрадостей",
    blocks: [
      {
        block: "section",
        lead: true,
        label: "архив\nрадостей",
        // «личный проект» в мете — сознательная оговорка: на главной кейс
        // стоит среди продуктовых, и читатель должен сразу видеть, что он свой
        // TODO срок: подставьте период работы над проектом (напр. «2025»)
        // meta: { role: "соло-дизайнер", team: "личный проект" },
        body: { text: "от исследования\nдо mvp продукта\nс активными юзерами" },
      },
      {
        block: "media",
        src: "/case4_1.png",
        caption:
          "продукт о том, чтобы за несколько секунд сохранить хороший момент и потом к нему вернуться: не дневник и не инструмент «для проблем»",
        align: "right",
      },
      {
        block: "section",
        label: "роль",
        body: {
          intro: "отвечала за",
          bullets: [
            "исследование: опрос на 130 респондентов, 30 глубинных интервью, трендвотчинг и анализ рынка",
            "продукт: сегменты, ключевые фичи, бизнес-модель и юнит-экономику",
            "дизайн: интерфейс и дизайн-систему продукта",
            "mvp и запуск: лендинг, рекламные кампании, telegram-бот",
          ],
        },
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
            label: "качественное исследование",
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
            "сохранить хороший момент за несколько секунд",
            "возвращаться к личному архиву воспоминаний",
            "постепенно формировать привычку замечать хорошее без ощущения «ведения дневника»"
          ],
        },
      },
      // {
      //   block: "media",
      //   src: "/bubble/128.webp"
      // },

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
      { block: "media", src: "/bubble/10-save-closeup.webp" },
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

// правая колонка: буллиты (точка слева от пункта), колонка (точка между
// пунктами) или абзац текста
function BodyView({ body }: { body: Body }) {
  if ("bullets" in body) {
    return (
      <>

        <ul className="case__bullets">
          {body.bullets.map((item, i) => (
            <li className="case__bullet" key={i}>
              <span className="case__dot" aria-hidden="true" />
              <span>{withBreaks(item)}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  // разделители рисует css (псевдоэлемент каждого пункта, кроме первого) —
  // в разметке лишних узлов нет, и точка не попадает в текст при копировании
  if ("column" in body) {
    return (
      <ul className="case__column">
        {body.column.map((item, i) => (
          <li className="case__column-item" key={i}>
            {withBreaks(item)}
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

// класс ряда: залипание названия — опция блока, а не поведение всех рядов
// подряд, поэтому модификатор навешивается точечно
function rowClass(sticky?: boolean) {
  return sticky ? "case__row case__row--sticky" : "case__row";
}

// path — адрес блока в дереве (индексы от корня); из него собирается якорь,
// одинаковый и в рендере, и в оглавлении. depth: 0 — блоки самого кейса,
// 1 — блоки внутри вложенного кейса; от него зависят кегль названий секций и
// уровень заголовка (h2 → h3), чтобы вложенность читалась и глазом, и парсером
function BlockView({
  block,
  path,
  depth = 0,
}: {
  block: Block;
  path: number[];
  depth?: number;
}) {
  const id = hasAnchor(block) ? anchorId(path) : undefined;

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
            <div className={rowClass(row.sticky)} key={i}>
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

  // хайлайт: единственный блок в рамке. Слева — надзаголовок («инициатива») и
  // название, справа — тело; сетка та же, что у секций, поэтому карточка не
  // выпадает из вертикальной оси страницы
  if (block.block === "highlight") {
    // раскладка у ролика и картинки общая (подложку держит текст рядом,
    // медиа вписывается в неё), различается только обработка: ролик приглушён
    // и подрезан под свою окантовку — картинка идёт как есть (см. --still в css)
    const still = !!block.media && !isVideoSrc(block.media);
    return (
      <aside className="case__highlight" id={id}>
        <div className={rowClass(block.sticky)}>
          {/* ролик в левой колонке. .case__highlight-frame — рамка-кроп: она
             прячет края ролика (у файла по контуру своя окантовка), поэтому
             видео внутри чуть увеличено и обрезается по её границам */}
          {block.media && (
            <div className="case__highlight-media">
              <span className="case__highlight-frame">
                {still ? (
                  // картинка занимает рамку целиком и идёт в полную силу цвета:
                  // приглушение и кроп ниже настроены под ролик (у файла своя
                  // белая окантовка), фотографии от них только выцветают
                  <img
                    className="case__highlight-video case__highlight-video--still"
                    src={block.media}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <LazyVideo
                    className="case__highlight-video"
                    src={block.media}
                    playOn="hover"
                  />
                )}
              </span>
            </div>
          )}
          <div className="case__lead">
            {block.eyebrow && (
              <p className="case__eyebrow">{typo(block.eyebrow)}</p>
            )}
            <h2 className="case__label">{withBreaks(block.label)}</h2>
          </div>
          <div className="case__body">
            <BodyView body={block.body} />
          </div>
        </div>
      </aside>
    );
  }

  // вложенный кейс: собственный заголовок с описанием, дальше — его секции тем
  // же рендером, но на уровень глубже
  if (block.block === "nested") {
    return (
      <section className="case__nested" id={id}>
        <div className="case__row case__nested-head">
          {/* подпись и заголовок — одной ячейкой первой колонки: .case__row —
             сетка 1fr | 1fr, и отдельным ребёнком подпись заняла бы место
             заголовка, а тот уехал бы во второй ряд */}
          <div className="case__nested-lead">
            {block.eyebrow && (
              <p className="case__eyebrow case__eyebrow--nested">
                {typo(block.eyebrow)}
              </p>
            )}
            <h2 className="case__nested-title">{withBreaks(block.label)}</h2>
          </div>
          <div className="case__body">
            {block.body && <BodyView body={block.body} />}
          </div>
        </div>
        <div className="case__content case__nested-content">
          {block.blocks.map((child, i) => (
            <BlockView key={i} block={child} path={[...path, i]} depth={depth + 1} />
          ))}
        </div>
      </section>
    );
  }

  // у заголовка кейса под названием идёт строка «роль · команда · срок».
  // label и она живут в одной обёртке: .case__row — сетка в две колонки, и
  // третий прямой ребёнок уехал бы во второй ряд, под название
  if (block.lead) {
    return (
      <div className={rowClass(block.sticky)} id={id}>
        <div className="case__lead">
          {/* название кейса — h1 страницы: до этого вся страница шла без
             единого заголовка, и парсеры видели плоскую простыню абзацев */}
          <h1 className="case__label case__label--lead">
            {withBreaks(block.label)}
          </h1>
          {block.meta && <CaseMetaLine meta={block.meta} />}
        </div>
        <div className="case__body case__body--lead">
          <BodyView body={block.body} />
        </div>
      </div>
    );
  }

  // названия секций («контекст», «проблемы», «результат») — h2 под h1 кейса:
  // это те же пункты, что и в оглавлении справа. Внутри вложенного кейса они
  // уходят на уровень ниже — под его собственный h2
  const Heading = depth > 0 ? "h3" : "h2";
  return (
    <div className={rowClass(block.sticky)} id={id}>
      <Heading className="case__label">{withBreaks(block.label)}</Heading>
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

// оглавление (toc): якорь получают содержательные блоки — секции с непустым
// названием (включая lead — заголовок кейса, чтобы из середины страницы можно
// было вернуться к началу), блок процесса ("steps") и вложенный кейс. Медиа
// пропускаются всегда, хайлайты — по умолчанию: они попадают в список только
// с флагом toc (см. тип блока).
//
// id блока = его путь в дереве блоков (sec-4-2 — третий блок внутри пятого):
// и оглавление, и рендер считают его одной функцией от пути, поэтому якоря
// сходятся сами, без параллельной карты индексов
function hasAnchor(block: Block): boolean {
  return (
    block.block === "steps" ||
    block.block === "nested" ||
    (block.block === "highlight" && !!block.toc) ||
    (block.block === "section" && !!block.label)
  );
}

// в оглавлении lead-секция называется не своим заголовком (он и так висит
// сверху страницы), а нейтральным «о проекте» — это первый пункт списка
const LEAD_TOC_LABEL = "о проекте";

function anchorId(path: number[]) {
  return `sec-${path.join("-")}`;
}

// depth — уровень вложенности пункта: 0 — секции самого кейса, 1 — секции
// вложенного кейса (в оглавлении они мельче и с отступом)
type TocItem = { id: string; label: string; depth: number };

function tocItems(blocks: Block[], prefix: number[] = [], depth = 0): TocItem[] {
  const items: TocItem[] = [];
  blocks.forEach((block, i) => {
    const path = [...prefix, i];
    if (block.block === "nested") {
      items.push({ id: anchorId(path), label: block.label, depth });
      // сам вложенный кейс — пункт того же уровня, его секции — на уровень ниже
      items.push(...tocItems(block.blocks, path, depth + 1));
    } else if (block.block === "steps") {
      items.push({ id: anchorId(path), label: block.label ?? "процесс", depth });
    } else if (block.block === "highlight" && block.toc) {
      items.push({ id: anchorId(path), label: block.label, depth });
    } else if (block.block === "section" && block.label) {
      items.push({
        id: anchorId(path),
        label: block.lead ? LEAD_TOC_LABEL : block.label,
        depth,
      });
    }
  });
  return items;
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
          className={[
            "case__toc-link",
            it.depth > 0 && "case__toc-link--sub",
            active === it.id && "is-active",
          ]
            .filter(Boolean)
            .join(" ")}
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
            <BlockView key={i} block={block} path={[i]} />
          ))}
        </div>

        {/* сноска про содержимое картинок — после кейса, но до перехода на
            следующий: это подпись именно к этой странице */}
        {data.disclaimer && (
          <p className="case__disclaimer">{withBreaks(data.disclaimer)}</p>
        )}

        {next && (
          <Link className="case__next" to={`/case/${next.slug}/`}>
            {/* <span className="case__next-label">следующий кейс</span> */}
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
