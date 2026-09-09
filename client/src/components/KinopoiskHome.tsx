import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Link } from "react-router-dom";
import { TELEGRAM_URL, WRITE_LABEL } from "../lib/contacts";
import { typo } from "../lib/typo";
import { Sections } from "./Sections";
import "./Hero.css";
import "./KinopoiskHome.css";

type BlurTune = {
  x: number;
  y: number;
  sizeX: number;
  sizeY: number;
  edgeBlur: number;
  centerBlur: number;
  centerBias: number;
  core: number;
  tint: number;
};

type BlurStep = {
  id: string;
  blur: number;
  w: number;
  h: number;
  mobileW: number;
  mobileH: number;
  solid: number;
  fade: number;
};

const BLUR_TUNE: BlurTune = {
  x: 61,
  y: 14.5,
  sizeX: 4.01,
  sizeY: 1.97,
  edgeBlur: 0,
  centerBlur: 34.5,
  centerBias: 1,
  core: 2.75,
  tint: 0,
};

const BLUR_MOBILE_POSITION = {
  x: 64,
  y: 23,
};

const BLUR_REGION = {
  desktop: { top: -2, height: 36 },
  compact: { top: 0, height: 45 },
};

const BLUR_STEPS: BlurStep[] = [
  { id: "01", blur: 1.092, w: 30, h: 15, mobileW: 34, mobileH: 12, solid: 62, fade: 88 },
  { id: "02", blur: 3.141, w: 26, h: 13, mobileW: 29.5, mobileH: 10.4, solid: 58, fade: 82 },
  { id: "03", blur: 9.288, w: 22, h: 11, mobileW: 25, mobileH: 8.8, solid: 54, fade: 76 },
  { id: "04", blur: 19.534, w: 18, h: 9, mobileW: 20.5, mobileH: 7.2, solid: 50, fade: 71 },
  { id: "05", blur: 33.878, w: 14.5, h: 7.25, mobileW: 16.5, mobileH: 5.8, solid: 47, fade: 67 },
  { id: "06", blur: 52.32, w: 12.8, h: 6.4, mobileW: 14.5, mobileH: 5.2, solid: 42, fade: 62 },
  { id: "07", blur: 74.86, w: 11.2, h: 5.6, mobileW: 12.7, mobileH: 4.55, solid: 38, fade: 58 },
  { id: "08", blur: 101.499, w: 9.8, h: 4.9, mobileW: 11.1, mobileH: 4, solid: 34, fade: 54 },
  { id: "09", blur: 132.236, w: 8.6, h: 4.3, mobileW: 9.7, mobileH: 3.5, solid: 30, fade: 50 },
  { id: "10", blur: 190, w: 7.5, h: 3.75, mobileW: 8.5, mobileH: 3.05, solid: 26, fade: 46 },
];

const MIN_RENDERED_BLUR = 1;

function KinopoiskRays() {
  return (
    <div className="kp-ray-field" aria-hidden="true">
      <img className="kp-rays-svg" src="/kinopoisk/rays.svg" alt="" />
    </div>
  );
}

function getLayerStyle(step: BlurStep, index: number, tune: BlurTune, isCompact: boolean) {
  const t = index / Math.max(BLUR_STEPS.length - 1, 1);
  const blurProgress = Math.pow(t, 1 + tune.centerBias * 4);
  const sizeProgress = Math.pow(t, 0.75 + tune.centerBias * 1.7);
  const coreScale = 1 - sizeProgress * (1 - tune.core);
  const region = isCompact ? BLUR_REGION.compact : BLUR_REGION.desktop;
  const x = isCompact ? tune.x + (BLUR_MOBILE_POSITION.x - BLUR_TUNE.x) : tune.x;
  const stageY = isCompact ? tune.y + (BLUR_MOBILE_POSITION.y - BLUR_TUNE.y) : tune.y;
  const y = ((stageY - region.top) / region.height) * 100;
  const width = (isCompact ? step.mobileW : step.w) * tune.sizeX * coreScale;
  const height = ((isCompact ? step.mobileH : step.h) * tune.sizeY * coreScale * 100) / region.height;
  const blur = tune.edgeBlur + (tune.centerBlur - tune.edgeBlur) * blurProgress;

  return {
    "--kp-blur": `${blur}px`,
    "--kp-layer-left": `${x - width / 2}%`,
    "--kp-layer-top": `${y - height / 2}%`,
    "--kp-layer-w": `${width}%`,
    "--kp-layer-h": `${height}%`,
    "--kp-mask-solid": `${step.solid}%`,
    "--kp-mask-fade": `${step.fade}%`,
    "--kp-blur-tint": tune.tint,
  } as CSSProperties;
}

function getLayerBlur(index: number, tune: BlurTune) {
  const t = index / Math.max(BLUR_STEPS.length - 1, 1);
  const blurProgress = Math.pow(t, 1 + tune.centerBias * 4);
  return tune.edgeBlur + (tune.centerBlur - tune.edgeBlur) * blurProgress;
}

function ProgressiveBlur({
  tune,
  isCompact,
}: {
  tune: BlurTune;
  isCompact: boolean;
}) {
  return (
    <div className="kp-progressive-blur" aria-hidden="true" data-node-id="478:19455">
      {BLUR_STEPS.map((step, index) =>
        getLayerBlur(index, tune) >= MIN_RENDERED_BLUR ? (
          <span
            className={`kp-blur-layer kp-blur-layer--${step.id}`}
            key={step.id}
            style={getLayerStyle(step, index, tune, isCompact)}
          />
        ) : null,
      )}
    </div>
  );
}

function KinopoiskHeader({
  innerRef,
  gridRef,
  avatarRef,
  isStuck,
  metaTop,
}: {
  innerRef: RefObject<HTMLDivElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;
  avatarRef: RefObject<HTMLImageElement | null>;
  isStuck: boolean;
  metaTop: number;
}) {
  return (
    <section
      className={`hero kp-header-host${isStuck ? " is-stuck" : ""}`}
      aria-label="Навигация"
    >
      <div
        ref={innerRef}
        className={`hero__inner${isStuck ? " is-stuck" : ""}`}
        style={{ "--meta-top": `${metaTop}px` } as CSSProperties}
      >
        <div className="hero__meta hero__meta--left">
          <img
            ref={avatarRef}
            className="hero__avatar"
            src="/avatar.jpeg"
            alt="Карина Р."
          />
          <span>карина р.</span>
          <span className="hero__dot" aria-hidden="true" />
          <Link className="hero__link" to="/cv/">
            cv
          </Link>
        </div>
        <div className="hero__grid kp-header-spacer" ref={gridRef} aria-hidden="true">
          <h1 className="hero__cell hero__cell--left hero__cell--trigger hero__cell--display">
            <span className="hero__text">
              продуктовый
              <br />
              дизайнер
            </span>
          </h1>
          <p className="hero__cell hero__cell--accent hero__cell--trigger hero__cell--display">
            <span className="hero__text hero__desktop-only">
              двигаю&nbsp;компоненты,<br />смотрю&nbsp;метрики;
            </span>
            <span className="hero__mobile-only">
              разбираю сложные сценарии, двигаю компоненты, смотрю метрики;
              <span className="hero__mobile-paragraph">
                люблю красоту и приколы, сейчас рисую в&nbsp;яндексе
              </span>
            </span>
          </p>
          <p className="hero__cell hero__cell--left hero__cell--reveal hero__cell--display">
            <span className="hero__text">люблю красоту и&nbsp;приколы,</span>
          </p>
          <p className="hero__cell hero__cell--muted hero__cell--reveal hero__cell--display">
            <span className="hero__text">сейчас рисую</span>
            <br />
            <span className="hero__text">в&nbsp;яндексе</span>
          </p>
        </div>
        <div className="hero__meta hero__meta--right">
          <a
            className="hero__link"
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {WRITE_LABEL}
          </a>
        </div>
      </div>
    </section>
  );
}

function LoveSeatsTicketCard() {
  return (
    <>
      <div className="kp-ticket__seats" aria-hidden="true">
        <span className="kp-ticket__seat-pair">
          <i />
          <i />
        </span>
        <span className="kp-ticket__seat-pair">
          <i className="is-hot" />
          <i className="is-hot is-hot--flip" />
        </span>
        <span className="kp-ticket__seat-pair">
          <i />
          <i />
        </span>
      </div>
      <p className="kp-ticket__title">Love Seats</p>
      <p className="kp-ticket__caption">ряд 7, место 6, 7</p>
    </>
  );
}

function LoveSeatsTicket() {
  return (
    <div className="kp-ticket" aria-label="Love Seats, ряд 7, место 6, 7">
      <div className="kp-ticket__card kp-ticket__card--back" aria-hidden="true">
        <LoveSeatsTicketCard />
      </div>
      <div className="kp-ticket__card kp-ticket__card--front">
        <LoveSeatsTicketCard />
      </div>
    </div>
  );
}

function ConceptBlocks() {
  return (
    <>
      <section className="kp-concept kp-concept--currency" aria-label="Перевод валюты в сегодняшний смысл">
        <div className="kp-concept-copy kp-concept-copy--currency">
          <h3>{typo("сколько это сегодня?")}</h3>
          <p>
            {typo(
              "переводим суммы из кино в сегодняшние рубли с учётом инфляции и курса. дальше продолжаем сценарий через Пэй: показываем, сколько эта сумма может принести на Сейве",
            )}
          </p>
        </div>
        <div className="kp-concept-video-frame">
          <video
            className="kp-concept-video"
            src="/kinopoisk/dresser.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Пример интерфейса с переводом валюты и сейвом"
          />
        </div>
      </section>

      <section className="kp-concept kp-concept--manolo" aria-label="Сейв на конкретную вещь">
        <img
          className="kp-concept-image"
          src="/kinopoisk/manolo.png"
          alt="Пример карточки сейва на туфельки Manolo Blahnik"
        />
        <div className="kp-concept-copy kp-concept-copy--manolo">
          <h3>{typo("хочу такое же")}</h3>
          <p>
            {typo(
              "во время просмотра часто хочется найти вещь из кадра: узнать, что это, сколько стоит и сохранить себе",
            )}
            <br />
            <br />
            {typo(
              "здесь Пэй может продолжить сценарий — показать сегодняшнюю стоимость и предложить сразу создать Сейв на эту сумму. возможно, так я бы уже давно накопила на manolo blahnik... :)",
            )}
          </p>
        </div>
      </section>
    </>
  );
}

type KinopoiskHomeProps = {
  withPortfolio?: boolean;
};

function scrollToCases() {
  const target = document.getElementById("cases");
  if (!target) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

function KinopoiskStage({
  isCompact,
  showScroll,
}: {
  isCompact: boolean;
  showScroll: boolean;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const headerInnerRef = useRef<HTMLDivElement | null>(null);
  const headerGridRef = useRef<HTMLDivElement | null>(null);
  const headerAvatarRef = useRef<HTMLImageElement | null>(null);
  const headerStuckRef = useRef(false);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const [metaTop, setMetaTop] = useState(0);

  useLayoutEffect(() => {
    const inner = headerInnerRef.current;
    const grid = headerGridRef.current;
    if (!inner || !grid) return;

    const measure = () => {
      const gridBox = grid.getBoundingClientRect();
      const innerBox = inner.getBoundingClientRect();
      setMetaTop(Math.max(0, gridBox.top - innerBox.top));
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

  useEffect(() => {
    const onScroll = () => {
      const isMobile = window.matchMedia("(max-width: 760px)").matches;
      const shouldStick = isMobile
        ? window.scrollY >= window.innerHeight * 0.18
        : window.scrollY >= metaTop - 20;

      if (shouldStick !== headerStuckRef.current) {
        headerStuckRef.current = shouldStick;
        setIsHeaderStuck(shouldStick);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [metaTop]);

  return (
    <div className="kp-stage-shell">
      <div className="kp-stage" ref={stageRef}>
        <KinopoiskRays />
        <ProgressiveBlur tune={BLUR_TUNE} isCompact={isCompact} />

        <div className="kp-hero-glow" aria-hidden="true" />
        <div className="kp-fade kp-fade--between-1" aria-hidden="true" />
        <div className="kp-fade kp-fade--middle" aria-hidden="true" />
        <div className="kp-fade kp-fade--between-2" aria-hidden="true" />

        <KinopoiskHeader
          innerRef={headerInnerRef}
          gridRef={headerGridRef}
          avatarRef={headerAvatarRef}
          isStuck={isHeaderStuck}
          metaTop={metaTop}
        />

        <h1 className="kp-title">
          специальный показ
          <br />
          для кинопоиска
        </h1>

        <div className="kp-copy kp-copy--intro">
          <p>привет! эта страничка для вас :)</p>
          <p>
            вакансия слишком хорошо совпала с тем, что мне хочется делать
            дальше, так что проходите на задний ряд {"<3"}
          </p>
        </div>

        <LoveSeatsTicket />

        <p className="kp-heading kp-heading--seats">занимайте места</p>

        <section className="kp-copy-block kp-copy-block--match" aria-label="Мэтч по жанрам">
          <h2>мэтч по жанрам</h2>
          <p>
            мне нравится ваш стык продукта и коммуникаций — я начинала с комдиза,
            а сейчас занимаюсь продуктами в инфре яндекса и очень горю по хорошим
            картинкам
          </p>
        </section>

        <section className="kp-copy-block kp-copy-block--pay" aria-label="Концепты">
          <h2>а еще я уже накидала</h2>
          <p>
            мне захотелось обыграть, как можно заколлабить с Пэй и  накидала два концепта
             <br />
              <br />
            хотелось встроить в реальный флоу, так чтобы интегарция была уже полезная в моменте до оплаты, была повторяемой и работала еще и на бренд: фин. продукт появляется в естественном контексте и становится привычной частью опыта

          </p>
        </section>

        <ConceptBlocks />

        <section className="kp-copy-block kp-copy-block--thanks" aria-label="Спасибо">
          <h2>спасибо!</h2>
          <p>
            в любом случае очень жду вашей обратной связи! {"<3"}
            <br />
            снизу кейсы, а обычная версия портфолио{" "}
            <a className="kp-inline-link" href="https://okonnaya.com">
              тут
            </a>
            
            <br />
            хорошего денька!
          </p>
        </section>

        {showScroll ? (
          <button
            type="button"
            className="kp-scroll"
            aria-label="К кейсам"
            onClick={scrollToCases}
          >
            <span className="kp-scroll__arrow" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function KinopoiskHome({ withPortfolio = false }: KinopoiskHomeProps) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    document.title = "специальный показ для кинопоиска — карина р.";
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const syncCompact = () => setIsCompact(query.matches);

    syncCompact();
    query.addEventListener("change", syncCompact);

    return () => query.removeEventListener("change", syncCompact);
  }, []);

  return (
    <main className="kp-page">
      <KinopoiskStage isCompact={isCompact} showScroll={withPortfolio} />
      {withPortfolio ? <Sections productTitle="фильмография" /> : null}
    </main>
  );
}
