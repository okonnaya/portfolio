import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import { TELEGRAM_URL, WRITE_LABEL } from "../lib/contacts";
import "./Hero.css";

type Props = {
  /** включить/выключить фоновые круги */
  onActiveChange: (v: boolean) => void;
};

/**
 * Факты «про меня» — карточки-стикеры, разбросанные по первому экрану вместе
 * с направляющими (ховер на «двигаю компоненты»). Каждый висит на своей
 * вертикали композиции — как аннотация к гайду, а не сам по себе:
 *   x1 — левая вертикаль (левый край «продуктовый дизайнер»),
 *   x3 — правая вертикаль (правый край поля оптической компенсации),
 *   x4 — левый край аватарки в мете (у неё своя вертикаль, см. .hero__guide).
 * Значения меряются в Hero (и тексты, и мета — hug-ширины, в CSS не вычислить).
 *
 * y — CSS-длина от верха композиции. Обычно это доли высоты экрана (сама
 * композиция центрируется по вьюпорту, поэтому разброс держится похожим на
 * макет на любом экране), но «жим ногами» посажен на нижнюю горизонталь
 * композиции — там замеренный y2, и поджимать его на низких экранах не нужно.
 * Переносы строк заданы руками — ровно как в фигме.
 *
 * tilt/lift — как превью ведёт себя под курсором. Значения намеренно разные у
 * каждой карточки (и знак угла чередуется): одинаковый наклон на всех читался
 * бы как один общий эффект, а разнобой — как стопка живых стикеров.
 */
const FACTS = [
  {
    img: "/facts/ufa.webp",
    lines: ["родилась", "в столице рэпа"],
    x: "var(--fact-x1)",
    y: "calc(-29.8vh * var(--fact-spread, 1))",
    tilt: "-9deg",
    lift: "4px",
  },
  {
    img: "/facts/hse.svg",
    lines: ["красный диплом", "ниу вшэ"],
    x: "var(--fact-x1)",
    y: "calc(24.2vh * var(--fact-spread, 1) + 100px)",
    tilt: "6deg",
    lift: "2px",
  },
  {
    img: "/facts/sber.svg",
    lines: ["рисовала картинки", "для грефа"],
    x: "var(--fact-x3)",
    y: "calc(24.2vh * var(--fact-spread, 1) + 100px)",
    tilt: "-5deg",
    lift: "5px",
  },
  {
    img: "/facts/gym.webp",
    lines: ["жим ногами", "100кг"],
    x: "var(--fact-x4)",
    y: "var(--fact-y3)",
    tilt: "11deg",
    lift: "3px",
  },
];

const GUIDE_DOT_XS = [
  "var(--fact-x1)",
  "calc(50% - var(--opt-comp) / 2 - var(--col-gap) / 2)",
  "calc(50% - var(--opt-comp) / 2 + var(--col-gap) / 2)",
  "var(--guide-x2)",
  "var(--fact-x3)",
  "var(--fact-x4)",
];

const GUIDE_DOT_YS = ["0px", "var(--fact-y2)"];

/**
 * Главный экран портфолио: мета-строки по краям + центральная
 * двухколоночная композиция. Ряды выровнены по верху, весь блок —
 * по центру вьюпорта по высоте.
 *
 * Поле частиц на старте скрыто. Наведение на «продуктовый дизайнер»
 * проявляет его (и строку «с любовью к красивому»); клик «закрепляет»
 * поле — оно остаётся после ухода курсора. Повторный клик или уход
 * курсора (если поле не закреплено) убирает его.
 */
export function Hero({ onActiveChange }: Props) {
  const [active, setActive] = useState(false);
  const pinned = useRef(false); // закреплено кликом — не гаснет на mouseleave

  // направляющие (как в фигме): отдельное состояние, своя логика закрепления
  const [guides, setGuides] = useState(false);
  const guidesPinned = useRef(false);

  // когда скролл всё погасил — состояние сбрасывается в исходное (открепляем,
  // выключаем круги/направляющие/нижние тексты), и наверх оно само не возвращается.
  // оживить можно только новым ховером/кликом. dismissed — одноразовый флаг на
  // проход «вниз за кромку гашения», сбрасывается при перезарядке
  const dismissed = useRef(false);

  // подсказка «сюда можно навести»: через секунду после загрузки у «двигаю
  // компоненты» проявляется курсор из макета, подъезжает к строке сверху-слева
  // и гаснет (сама анимация — в Hero.css). Заводится на каждой загрузке, но
  // только пока человек сам не навёлся на один из двух заголовков-триггеров:
  // подсказка объясняет, что на них есть ховер, и тому, кто уже там побывал,
  // она не нужна. hinted покрывает оба случая — и отмену до показа (таймер ещё
  // не сработал), и гашение уже играющей анимации
  const [hint, setHint] = useState(false);
  const hinted = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!hinted.current) setHint(true);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  // ховер/клик снова проявляют эффекты «как при загрузке»: снимаем флаг сброса
  // (чтобы следующий скролл вниз снова всё погасил). сюда же вешаем снятие
  // подсказки: rearm зовут ровно обработчики двух заголовков
  const rearm = () => {
    dismissed.current = false;
    hinted.current = true;
    setHint(false);
  };

  useEffect(() => {
    const onScroll = () => {
      // чуть ушли вниз (десятая экрана) — гасим эффекты (каждый своим способом:
      // круги — стаггер-задержками, линии — градиентной маской)
      if (window.scrollY >= window.innerHeight * 0.1 && !dismissed.current) {
        dismissed.current = true;
        pinned.current = false;
        guidesPinned.current = false;
        setActive(false);
        onActiveChange(false);
        setGuides(false);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onActiveChange]);

  // мета («навбар») выравнивается по верхнему краю центрального текста. inner
  // растянут на 100vh ради sticky на весь экран, поэтому флекс центрирует сетку,
  // а мете нужен отступ сверху = смещению верха сетки. меряем его и кладём в
  // CSS-переменную --meta-top (см. Hero.css). пересчитываем на ресайз/реflow.
  const innerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [metaTop, setMetaTop] = useState(0);

  // якоря для карточек-фактов (см. FACTS). и тексты композиции, и мета — hug по
  // ширине, поэтому левый край «продуктовый дизайнер», правый край поля
  // опт-компенсации и левый край аватарки в CSS не выразить: меряем тем же
  // проходом, что и --meta-top. y2 — верх второго ряда (нижняя горизонталь)
  const leftCellRef = useRef<HTMLHeadingElement>(null);
  const accentRef = useRef<HTMLParagraphElement>(null);
  const optRef = useRef<HTMLSpanElement>(null);
  const avatarRef = useRef<HTMLImageElement>(null);
  const row2Ref = useRef<HTMLParagraphElement>(null);
  const [anchors, setAnchors] = useState({
    x1: 0,
    x2: 0,
    x3: 0,
    x4: 0,
    y2: 0,
    y3: 0,
  });

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const grid = gridRef.current;
    if (!inner || !grid) return;
    const measure = () => {
      const g = grid.getBoundingClientRect();
      setMetaTop(Math.max(0, g.top - inner.getBoundingClientRect().top));

      const left = leftCellRef.current?.getBoundingClientRect();
      const opt = optRef.current?.getBoundingClientRect();
      const avatar = avatarRef.current?.getBoundingClientRect();
      const row2 = row2Ref.current?.getBoundingClientRect();
      if (!left || !opt || !avatar || !row2) return;
      setAnchors({
        x1: left.left - g.left,
        x2: opt.left - g.left,
        x3: opt.right - g.left,
        x4: avatar.left - g.left,
        y2: row2.top - g.top,
        y3: row2.bottom - g.top,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    ro.observe(grid);
    // триггеры — hug-ширины: их бокс меняется, когда догружается шрифт (высота
    // сетки при этом та же, на неё одну полагаться нельзя)
    if (leftCellRef.current) ro.observe(leftCellRef.current);
    if (accentRef.current) ro.observe(accentRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // лёгкий bounce в момент, когда мета долетает до верха и залипает навбаром.
  // момент залипания ловим переходом в «прилипшее» состояние: скролл прошёл
  // естественную позицию меты (metaTop) минус её top:20px. класс is-stuck
  // вешается на этом переходе и одноразово проигрывает CSS-анимацию (см. Hero.css).
  // амплитуду/длительность баунса гоним от скорости скролла в момент залипания —
  // быстрый скролл «впечатывает» навбар сильнее, медленный едва качает (натуральнее).
  const [stuck, setStuck] = useState(false);
  const stuckRef = useRef(false);
  const lastY = useRef(0); // прошлый scrollY — для оценки скорости
  const lastT = useRef(0); // время прошлого скролл-события (мс)
  const springRaf = useRef(0); // id rAF-цикла пружины

  useEffect(() => {
    const inner = innerRef.current;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // возврат «назад» из кейса открывает главную с якорем (/#case-…): браузер
    // мгновенно проматывает к блоку кейса, и этот скачок выглядит как резкий
    // скролл в точку залипания → впустую играется пружина. в первые мс после
    // такой навигации баунс подавляем: навбар просто сразу залипший.
    const mountedAt = performance.now();
    const landedWithHash = window.location.hash !== "";

    // Пружина вместо CSS-кейфрейма: навбар «впечатывается» в верх с начальной
    // скоростью v0 (px/s, по ходу движения) и затухающе колеблется к нулю —
    // недодемпфированный гармонический осциллятор (F = −kx − cv). Поэтому есть
    // живой перелёт и пара затухающих качаний, а не линейный горб. Смещение
    // кладём в --bounce-y, его читает transform залипшей меты (см. Hero.css).
    const SPRING_K = 200; // жёсткость
    const SPRING_C = 9; // демпфирование (zeta≈0.32 → заметный, но недолгий перелёт)
    const startSpring = (v0: number) => {
      cancelAnimationFrame(springRaf.current);
      let x = 0; // смещение по Y, px
      let v = v0; // скорость, px/s
      let last = performance.now();
      const step = (now: number) => {
        let dt = (now - last) / 1000; // в секундах
        last = now;
        if (dt > 0.05) dt = 0.05; // клампим скачок (смена вкладки и т.п.)
        const a = -SPRING_K * x - SPRING_C * v;
        v += a * dt;
        x += v * dt;
        inner?.style.setProperty("--bounce-y", `${x.toFixed(2)}px`);
        if (Math.abs(x) > 0.05 || Math.abs(v) > 0.5) {
          springRaf.current = requestAnimationFrame(step);
        } else {
          inner?.style.setProperty("--bounce-y", "0px"); // дотягиваем ровно в ноль
        }
      };
      springRaf.current = requestAnimationFrame(step);
    };

    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const dt = now - lastT.current;
      const speed = dt > 0 ? Math.abs(y - lastY.current) / dt : 0; // px/ms
      lastY.current = y;
      lastT.current = now;

      const isStuck = y >= metaTop - 20;
      if (isStuck !== stuckRef.current) {
        stuckRef.current = isStuck;
        // баунс только при залипании и только если скролл был достаточно резким:
        // на медленном плавном скролле навбар просто встаёт, без качания.
        // restoring — программный доскролл к якорю кейса при возврате «назад»:
        // тогда баунс не играем (см. mountedAt/landedWithHash выше)
        const restoring = landedWithHash && performance.now() - mountedAt < 800;
        if (isStuck && !reduced && speed > 0.4 && !restoring) {
          // импульс вверх (по ходу движения) ∝ скорости; потолок держит перелёт ~15px
          startSpring(-Math.min(300, speed * 90));
        }
        setStuck(isStuck);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(springRaf.current);
    };
  }, [metaTop]);

  // единая точка переключения: и текст-ревил, и фоновое поле
  const show = (v: boolean) => {
    setActive(v);
    onActiveChange(v);
  };

  const handleEnter = () => {
    if (!pinned.current) {
      rearm();
      show(true);
    }
  };
  const handleLeave = () => {
    if (!pinned.current) show(false);
  };
  const handleClick = () => {
    if (pinned.current) {
      pinned.current = false;
      show(false); // повторный клик — убрать, даже если курсор ещё над текстом
    } else {
      pinned.current = true;
      rearm();
      show(true); // закрепить — останется после ухода курсора
    }
  };

  // ровно та же механика «ховер проявляет, клик закрепляет», но для направляющих
  const handleGuidesEnter = () => {
    if (!guidesPinned.current) {
      rearm();
      setGuides(true);
    }
  };
  const handleGuidesLeave = () => {
    if (!guidesPinned.current) setGuides(false);
  };
  const handleGuidesClick = () => {
    if (guidesPinned.current) {
      guidesPinned.current = false;
      setGuides(false);
    } else {
      guidesPinned.current = true;
      rearm();
      setGuides(true);
    }
  };

  const scrollToCases = () => {
    const target = document.getElementById("cases");
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <section className="hero" aria-label="Главный экран">
        <div
          className={`hero__inner${stuck ? " is-stuck" : ""}`}
          ref={innerRef}
          style={{ "--meta-top": `${metaTop}px` } as CSSProperties}
        >
          {/* левая мета: аватар · карина р. · cv.
             выровнена по верху ряда (= верх grid), а при скролле залипает
             в 20px от верха вьюпорта (position: sticky) */}
          <div className="hero__meta hero__meta--left">
            <img
              ref={avatarRef}
              className="hero__avatar"
              src="/avatar.jpeg"
              alt="Карина Р."
            />
            <span>карина р.</span>
            <span className="hero__dot" aria-hidden="true" />
            <Link className="hero__link" to="/cv">
              cv
            </Link>
          </div>

          {/* центральная композиция */}
          <div
            className={`hero__grid${guides ? " is-guides" : ""}${
              hint ? " is-hint" : ""
            }`}
            ref={gridRef}
            style={
              {
                "--fact-x1": `${anchors.x1}px`,
                "--guide-x2": `${anchors.x2}px`,
                "--fact-x3": `${anchors.x3}px`,
                "--fact-x4": `${anchors.x4}px`,
                "--fact-y2": `${anchors.y2}px`,
                "--fact-y3": `${anchors.y3}px`,
              } as CSSProperties
            }
          >
          {/* h1 страницы. Композиция показывает только роль, а имя стоит мелкой
             строкой в мете — для поисковиков и парсеров резюме этого мало, они
             читают заголовок. Поэтому фамилию дописываем невидимо: заголовок
             отдаётся как «карина рамазанова — продуктовый дизайнер», а на
             экране всё остаётся как в макете */}
          <h1
            ref={leftCellRef}
            className="hero__cell hero__cell--left hero__cell--trigger hero__cell--display"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={handleClick}
          >
            <span className="visually-hidden">карина рамазанова — </span>
            {/* только текст обёрнут в hero__text: на нём mix-blend-mode: difference.
               направляющие (::before/::after) и полосы остаются на <h1> — не блендятся */}
            <span className="hero__text">
              продуктовый
              <br />
              дизайнер
            </span>
            {/* зона наведения шире самого текста — см. .hero__hit в Hero.css */}
            <span className="hero__hit" aria-hidden="true" />
          </h1>
          <p
            ref={accentRef}
            className="hero__cell hero__cell--accent hero__cell--trigger hero__cell--display"
            onMouseEnter={handleGuidesEnter}
            onMouseLeave={handleGuidesLeave}
            onClick={handleGuidesClick}
          >
            <span className="hero__text">
              двигаю&nbsp;компоненты,<br />смотрю&nbsp;метрики;
            </span>
            {/* поле «оптической компенсации» — 40px справа от блока текста,
               его левая граница = правая вертикаль композиции. подпись —
               ОТДЕЛЬНЫМ узлом, не внутри полосы: радиальная маска-проявление
               полосы ярка только в центре и гаснет к краям, а длинная подпись
               уезжает в прозрачную зону маски и срезается. поэтому полосу
               оставляем под маской (вайп как у прочих гайдов), а подпись
               выносим наружу и проявляем непрозрачностью — её ничто не режет */}
            <span className="hero__band hero__opt" ref={optRef} aria-hidden="true" />
            <span className="hero__opt-label" aria-hidden="true">
              20 px • оптическая компенсация
            </span>
            {/* подсказка: курсор подъезжает к строке через 3с после загрузки.
               висит на акцентной ячейке — её левый верхний угол и есть начало
               «двигаю компоненты», к нему всё и едет (см. Hero.css) */}
            <img
              className="hero__cursor"
              src="/cursor.svg"
              alt=""
              aria-hidden="true"
            />
            <span className="hero__hit" aria-hidden="true" />
          </p>

          <p
            className={`hero__cell hero__cell--left hero__cell--reveal hero__cell--display${
              active ? " is-active" : ""
            }`}
          >
            <span className="hero__text">
              люблю красоту и приколы
            </span>
          </p>
          <p
            ref={row2Ref}
            className={`hero__cell hero__cell--muted hero__cell--reveal hero__cell--display${
              guides ? " is-active" : ""
            }`}
          >
            {/* строки — отдельными спанами: .hero__text это inline-block, и
               одним куском он занимал бы всю колонку (max-content шире неё),
               а логотипы срывались бы на новую строку. так они встают встык
               к концу «в яндексе», как в макете */}
            <span className="hero__text">сейчас рисую</span>
            <br />
            <span className="hero__text">в яндексе</span>
            {/* иконки сервисов встык к «в яндексе» — вне .hero__text: на нём
               difference, логотипы бы им перекрасило. inline-flex садится на
               базовую линию последней строки текста.

               ховер-обработчики те же, что у акцентной ячейки: ряд проявляется
               по guides, и уход курсора с триггера сюда гасил бы его раньше,
               чем курсор доедет до иконок. так логотипы сами удерживают
               состояние, пока на них наведено */}
            <span
              className="hero__logos"
              aria-hidden="true"
              onMouseEnter={handleGuidesEnter}
              onMouseLeave={handleGuidesLeave}
              onClick={handleGuidesClick}
            >
              <img className="hero__logo" src="/facts/yandex.webp" alt="" />
              <img
                className="hero__logo hero__logo--lg"
                src="/facts/yandex-infra.webp"
                alt=""
              />
            </span>
          </p>

            {/* полоса-мера column-gap по центру сетки */}
            <div className="hero__band hero__gap" aria-hidden="true">
              <span>20</span>
            </div>

            <div className="hero__guide-dots" aria-hidden="true">
              {GUIDE_DOT_YS.flatMap((y) =>
                GUIDE_DOT_XS.map((x) => (
                  <span
                    key={`${x}-${y}`}
                    className="hero__guide-dot"
                    style={
                      {
                        "--dot-x": x,
                        "--dot-y": y,
                      } as CSSProperties
                    }
                  />
                )),
              )}
            </div>

            {/* факты «про меня» — проявляются вместе с направляющими.
               слой лежит поверх сетки, но курсор не ловит: ховер держится на
               самом триггере, иначе карточки в стороне удерживали бы состояние.
               картинки декоративные (alt=""), сам факт несёт текст */}
            <div className="hero__facts">
              {/* своя вертикаль у аватарки: на ней стоит «жим ногами», и без
                 линии карточка висела бы в пустом поле ни на чём */}
              <span className="hero__guide" aria-hidden="true" />
              {FACTS.map((f, i) => (
                <span
                  key={f.lines.join(" ")}
                  className="hero__fact"
                  style={
                    {
                      "--fact-x": f.x,
                      "--fact-y": f.y,
                      "--fact-d": `${i * 0.06}s`,
                      "--fact-tilt": f.tilt,
                      "--fact-lift": f.lift,
                    } as CSSProperties
                  }
                >
                  <span className="hero__fact-thumb">
                    <img src={f.img} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="hero__fact-text">
                    {f.lines[0]}
                    <br />
                    {f.lines[1]}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* правая мета — так же залипает сверху при скролле */}
          <div className="hero__meta hero__meta--right">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
              {WRITE_LABEL}
            </a>
          </div>
        </div>
        <button
          type="button"
          className="hero__scroll"
          aria-label="Перейти к кейсам"
          onClick={scrollToCases}
        >
          <span className="hero__scroll-arrow" aria-hidden="true" />
        </button>
      </section>
    </>
  );
}
