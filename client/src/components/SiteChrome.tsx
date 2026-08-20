import { Link } from "react-router-dom";
import { TELEGRAM_URL, WRITE_LABEL } from "../lib/contacts";
import "./SiteChrome.css";

/**
 * Единый «хром» сайта — хедер и подвал в одном месте, чтобы не править их
 * в двух файлах. Общие мелочи (шрифт меты, точка-разделитель, ссылка-ховер)
 * живут в классах .chrome-* и переиспользуются обоими.
 *
 * SiteHeader — sticky-навбар: аватар · карина р. · cv | > приветик.
 * SiteFooter — подвал: для mvp просто «коммит карины р. 2026».
 * Интерактив «клик · чтобы вытянуть карту дня» пока скрыт — код ниже
 * закомментирован (KeyRays + разметка), стили остались в SiteChrome.css.
 */

// ── хедер ──────────────────────────────────────────────────────────────
// Та же мета, что и на первом экране главной. Без сложной механики залипания
// hero — просто sticky-строка в 20px от верха.
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__meta">
        <img className="site-header__avatar" src="/avatar.jpg" alt="Карина Р." />
        <Link className="chrome-link" to="/">
          карина р.
        </Link>
        <span className="chrome-dot" aria-hidden="true" />
        <Link className="chrome-link" to="/cv">
          cv
        </Link>
      </div>
      <a
        className="chrome-link"
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        {WRITE_LABEL}
      </a>
    </header>
  );
}

// ── подвал ─────────────────────────────────────────────────────────────
// три лучика-линии (верхняя вверх, средняя горизонтальная, нижняя вниз),
// как в макете. geometry из фигмы; на ховер разъезжаются по диагонали.
// Понадобится, когда вернём «клик · чтобы вытянуть карту дня».
// function KeyRays({ side }: { side: "left" | "right" }) {
//   return (
//     <svg
//       className={`key-rays key-rays--${side}`}
//       viewBox="0 0 10.342 23.7801"
//       preserveAspectRatio="none"
//       fill="none"
//       aria-hidden="true"
//     >
//       <path className="ray ray--top" d="M0.34202 7.4202L9.73895 4" />
//       <path className="ray ray--mid" d="M0.34202 13.4202H10.342" />
//       <path className="ray ray--bot" d="M0.34202 19.4202L9.73895 22.8404" />
//     </svg>
//   );
// }

export function SiteFooter() {
  return (
    <footer className="cases-footer">
      {/* пока mvp — одна строка вместо интерактива с картой дня:
      <span className="cases-footer__key" aria-hidden="true">
        <KeyRays side="left" />
        <span className="cases-footer__word">клик</span>
        <KeyRays side="right" />
      </span>
      <span>чтобы вытянуть карту дня</span>
      <span className="chrome-dot" aria-hidden="true" /> */}
      {/* в подвале — полное имя: шапка везде сокращает до «карина р.», и
          фамилия иначе живёт только на странице резюме */}
      <span>карина рамазанова</span>
      <span className="chrome-dot" aria-hidden="true" />
      <span>2026</span>
    </footer>
  );
}
