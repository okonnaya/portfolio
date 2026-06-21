import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./Hero.css";

type Props = {
  /** включить/выключить фоновые круги */
  onActiveChange: (v: boolean) => void;
};

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

  // ховер/клик снова проявляют эффекты «как при загрузке»: снимаем флаг сброса
  // (чтобы следующий скролл вниз снова всё погасил)
  const rearm = () => {
    dismissed.current = false;
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

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const grid = gridRef.current;
    if (!inner || !grid) return;
    const measure = () => {
      const dy =
        grid.getBoundingClientRect().top - inner.getBoundingClientRect().top;
      setMetaTop(Math.max(0, dy));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    ro.observe(grid);
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
        // на медленном плавном скролле навбар просто встаёт, без качания
        if (isStuck && !reduced && speed > 0.4) {
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
            <img className="hero__avatar" src="/avatar.jpg" alt="Карина Р." />
            <span>карина р.</span>
            <span className="hero__dot" aria-hidden="true" />
            <a className="hero__link" href="#cv">
              cv
            </a>
          </div>

          {/* центральная композиция */}
          <div className={`hero__grid${guides ? " is-guides" : ""}`} ref={gridRef}>
          <p
            className="hero__cell hero__cell--left hero__cell--trigger size-42"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={handleClick}
          >
            продуктовый
            <br />
            дизайнер
          </p>
          <p
            className="hero__cell hero__cell--accent hero__cell--trigger size-42"
            onMouseEnter={handleGuidesEnter}
            onMouseLeave={handleGuidesLeave}
            onClick={handleGuidesClick}
          >
            двигаю компоненты<br />смотрю за&nbsp;метриками
            {/* поле «оптической компенсации» — 20px справа от блока текста.
               его левая граница = правая вертикаль композиции */}
            <span className="hero__band hero__opt" aria-hidden="true">
              <span>оптическая компенсация</span>
            </span>
          </p>

          <p
            className={`hero__cell hero__cell--left hero__cell--reveal size-42${
              active ? " is-active" : ""
            }`}
          >
            с&nbsp;любовью<br />к&nbsp;красивому
          </p>
          <p
            className={`hero__cell hero__cell--muted hero__cell--reveal size-42${
              guides ? " is-active" : ""
            }`}
          >
             сейчас исследую<br />в&nbsp;инфре яндекса
          </p>

            {/* полоса-мера column-gap по центру сетки */}
            <div className="hero__band hero__gap" aria-hidden="true">
              <span>20</span>
            </div>
          </div>

          {/* правая мета — так же залипает сверху при скролле */}
          <div className="hero__meta hero__meta--right">
            <span> &gt; приветик</span>
          </div>
        </div>
      </section>

      {/* второй экран — уезжает под мету при скролле */}
      <section className="section-2" aria-label="Второй экран">
        <div className="section-2__inner">
          <p className="section-2__title size-42">второй экран</p>
        </div>
      </section>
    </>
  );
}
