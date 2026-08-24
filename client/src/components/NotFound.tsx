import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "./SiteChrome";
import { TELEGRAM_URL, WRITE_LABEL } from "../lib/contacts";
import "./NotFound.css";

/**
 * 404. Ловит и незнакомые адреса (роут `*` в App.tsx), и кейсы с неизвестным
 * slug — раньше такой адрес отдавал страницу-заглушку «скоро здесь будет
 * контент», то есть выглядел как настоящий, но пустой кейс.
 *
 * Вёрстка — та же, что у кейса: шапка, центральная колонка, подвал. Из тупика
 * есть три выхода: на главную, в резюме и написать.
 */
export function NotFound() {
  // в табе должно быть видно, что это не страница сайта, а тупик
  useEffect(() => {
    const before = document.title;
    document.title = "404 — карина р.";
    return () => {
      document.title = before;
    };
  }, []);

  return (
    <main className="case-page">
      <SiteHeader />

      <div className="case notfound">
        <p className="notfound__code">404</p>
        <h1 className="notfound__title">
          такой страницы нет
        </h1>
        <p className="notfound__text">
          возможно, адрес устарел или в нём опечатка
        </p>

        <nav className="notfound__links" aria-label="куда пойти">
          <Link className="notfound__link" to="/">
            ← на главную
          </Link>
          <Link className="notfound__link" to="/cv/">
            cv
          </Link>
          <a
            className="notfound__link"
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {WRITE_LABEL}
          </a>
        </nav>
      </div>

      <SiteFooter />
    </main>
  );
}
