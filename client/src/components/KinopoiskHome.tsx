import { useEffect, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { TELEGRAM_URL } from "../lib/contacts";
import { typo } from "../lib/typo";
import "./KinopoiskHome.css";

const BLUR_STEPS = [
  1.092, 3.141, 9.288, 19.534, 33.878, 52.32, 74.86, 101.499, 132.236,
  167.071,
];

const RAYS = [
  { x: 707, y: -4, length: 520, angle: 71, thickness: 6, opacity: 0.5, tone: "cool", delay: -2.2 },
  { x: 902, y: -28, length: 610, angle: 75, thickness: 6, opacity: 0.72, tone: "warm", delay: -4.8 },
  { x: 1080, y: -36, length: 700, angle: 76, thickness: 6, opacity: 0.8, tone: "warm", delay: -7.1 },
  { x: 1244, y: -26, length: 640, angle: 76, thickness: 5, opacity: 0.42, tone: "warm-soft", delay: -1.5 },
  { x: 356, y: 510, length: 370, angle: 58, thickness: 6, opacity: 0.82, tone: "cool", delay: -5.7 },
  { x: 460, y: 406, length: 555, angle: 58, thickness: 6, opacity: 0.54, tone: "cool-soft", delay: -8.6 },
  { x: 636, y: 514, length: 460, angle: 58, thickness: 6, opacity: 0.76, tone: "warm", delay: -3.6 },
  { x: 806, y: 530, length: 410, angle: 58, thickness: 5, opacity: 0.44, tone: "warm-soft", delay: -9.4 },
  { x: 962, y: 521, length: 430, angle: 58, thickness: 6, opacity: 0.58, tone: "warm", delay: -6.3 },
  { x: 1110, y: 455, length: 620, angle: 70, thickness: 6, opacity: 0.62, tone: "warm-soft", delay: -0.8 },
  { x: 1260, y: 430, length: 650, angle: 75, thickness: 5, opacity: 0.36, tone: "warm-soft", delay: -10.2 },
  { x: 74, y: 936, length: 200, angle: 47, thickness: 5, opacity: 0.26, tone: "cool-fade", delay: -4.1 },
  { x: 284, y: 922, length: 220, angle: 48, thickness: 5, opacity: 0.24, tone: "cool-soft", delay: -6.9 },
  { x: 476, y: 922, length: 230, angle: 49, thickness: 5, opacity: 0.3, tone: "warm-soft", delay: -2.9 },
  { x: 655, y: 912, length: 260, angle: 50, thickness: 5, opacity: 0.32, tone: "warm-soft", delay: -8 },
  { x: 828, y: 905, length: 280, angle: 52, thickness: 5, opacity: 0.26, tone: "warm-soft", delay: -1.3 },
  { x: 997, y: 900, length: 300, angle: 54, thickness: 5, opacity: 0.22, tone: "warm-fade", delay: -7.8 },
  { x: -56, y: 1640, length: 880, angle: 35, thickness: 6, opacity: 0.64, tone: "lower", delay: -5.4 },
  { x: -64, y: 1812, length: 840, angle: 35, thickness: 6, opacity: 0.72, tone: "lower", delay: -9.1 },
  { x: -68, y: 1988, length: 780, angle: 35, thickness: 6, opacity: 0.58, tone: "lower", delay: -3.4 },
  { x: 206, y: 1640, length: 700, angle: 35, thickness: 5, opacity: 0.34, tone: "lower-soft", delay: -11.2 },
  { x: 408, y: 1642, length: 650, angle: 35, thickness: 5, opacity: 0.22, tone: "lower-soft", delay: -0.4 },
  { x: 612, y: 1640, length: 560, angle: 35, thickness: 4, opacity: 0.16, tone: "lower-soft", delay: -6.2 },
  { x: -88, y: 2300, length: 360, angle: 18, thickness: 4, opacity: 0.2, tone: "warm-fade", delay: -10.7 },
];

const EXPERIENCE = [
  {
    title: "кнопка поиска\nв инпуте",
    desc: "как одна кнопка помогла 2к пользователей",
  },
  {
    title: "кнопка поиска\nв инпуте",
    desc: "как одна кнопка помогла 2к пользователей",
  },
];

function KinopoiskRays() {
  return (
    <div className="kp-ray-field" aria-hidden="true">
      {RAYS.map((ray, i) => (
        <span
          className={`kp-ray kp-ray--${ray.tone}`}
          key={`${ray.x}-${ray.y}-${i}`}
          style={
            {
              "--kp-ray-x": `${(ray.x / 1440) * 100}%`,
              "--kp-ray-y": `${(ray.y / 2635) * 100}%`,
              "--kp-ray-length": `${(ray.length / 1440) * 100}%`,
              "--kp-ray-angle": `${ray.angle}deg`,
              "--kp-ray-thickness": `${ray.thickness}px`,
              "--kp-ray-opacity": ray.opacity,
              "--kp-ray-delay": `${ray.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function KinopoiskHeader() {
  return (
    <header className="kp-header">
      <div className="kp-header__meta">
        <img className="kp-header__avatar" src="/avatar.jpeg" alt="Карина Р." />
        <Link className="kp-link" to="/">
          карина р.
        </Link>
        <span className="kp-dot" aria-hidden="true" />
        <Link className="kp-link" to="/cv">
          cv
        </Link>
      </div>
      <a
        className="kp-link"
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        приветик
      </a>
    </header>
  );
}

function ProgressiveBlur() {
  return (
    <div className="kp-progressive-blur" aria-hidden="true">
      {BLUR_STEPS.map((blur, i) => (
        <span
          className={`kp-blur-mask kp-blur-mask--${i + 1}`}
          key={blur}
          style={{ "--kp-blur": `${blur}px` } as CSSProperties}
        />
      ))}
    </div>
  );
}

function LoveSeatsTicket() {
  return (
    <div className="kp-ticket" aria-label="Love Seats, ряд 7, место 6, 7">
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
    </div>
  );
}

function lines(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {typo(line)}
    </span>
  ));
}

function ExperienceBlock({
  title,
  desc,
  index,
}: (typeof EXPERIENCE)[number] & { index: number }) {
  return (
    <>
      <div className={`kp-case-copy kp-case-copy--${index + 1}`}>
        <h3>{lines(title)}</h3>
        <p>{typo(desc)}</p>
      </div>
      <div className={`kp-placeholder kp-placeholder--${index + 1}`} aria-hidden="true" />
    </>
  );
}

export function KinopoiskHome() {
  useEffect(() => {
    document.title = "специальный показ для кинопоиска — карина р.";
  }, []);

  return (
    <main className="kp-page">
      <div className="kp-stage-shell">
        <div className="kp-stage">
          <KinopoiskRays />
          <ProgressiveBlur />

          <div className="kp-fade kp-fade--hero" aria-hidden="true" />
          <div className="kp-fade kp-fade--between-1" aria-hidden="true" />
          <div className="kp-fade kp-fade--middle" aria-hidden="true" />
          <div className="kp-fade kp-fade--between-2" aria-hidden="true" />

          <KinopoiskHeader />

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
              мне нравится ваш стык продукта и коммуникаций — я начинала с комдива,
              а сейчас занимаюсь продуктами в инфре яндекса и очень горю по хорошим
              картинкам
            </p>
          </section>

          <section className="kp-copy-block kp-copy-block--pay" aria-label="Концепты">
            <h2>а еще я уже накидала</h2>
            <p>
              мне захотелось обыграть, как можно заколлабить с Пэй,
              <br />
              я накинула два концепта
            </p>
          </section>

          <section className="kp-copy-block kp-copy-block--experience" aria-label="Опыт">
            <h2>а еще я уже накидала</h2>
          </section>

          <section aria-label="Плейсхолдеры опыта">
            {EXPERIENCE.map((item, i) => (
              <ExperienceBlock key={i} {...item} index={i} />
            ))}
          </section>

          <section className="kp-copy-block kp-copy-block--thanks" aria-label="Спасибо">
            <h2>спасибо!</h2>
            <p>
              в любом кейсе очень жду вашей обратной связи! {"<3"}
              <br />
              хорошего денечка
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
