import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { CasePage } from "./components/CasePage";
import { ContactNudge } from "./components/ContactNudge";
import { CvPage } from "./components/CvPage";
import { Home } from "./components/Home";
import { NotFound } from "./components/NotFound";
import { sendHit } from "./lib/metrika";
import { PORTFOLIO_VARIANT } from "./lib/site";

/** Сброс скролла при смене маршрута. Если в url есть якорь (#case-<slug>) —
    это возврат «назад» из кейса: скроллим к соответствующему блоку на главной,
    иначе новая страница открывалась бы на прежней позиции. Без якоря — наверх. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // элемент может ещё не быть в dom на момент эффекта — ждём кадр
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "start" });
        else window.scrollTo(0, 0);
      });
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Просмотры страниц в Метрику при навигации роутером (см. lib/metrika.ts).
    Первый экран считает сам счётчик на init — его пропускаем, иначе вход
    удвоился бы. Дальше на каждый новый адрес шлём хит, referer'ом — предыдущий:
    так в отчётах виден путь по сайту, а не набор изолированных заходов.
    Якорь в адрес не берём: возврат «назад» из кейса открывает главную как
    /#case-<slug> — это тот же просмотр главной, а не отдельный. */
function MetrikaHits() {
  const { pathname, search } = useLocation();
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = window.location.origin + pathname + search;
    // на монтировании только запоминаем адрес входа — хит по нему уже ушёл
    if (prevUrl.current !== null && prevUrl.current !== url) {
      sendHit(url, prevUrl.current);
    }
    prevUrl.current = url;
  }, [pathname, search]);

  return null;
}

/** Роутинг: главная, страница отдельного кейса (по клику на медиа) и резюме. */
function App() {
  useEffect(() => {
    document.documentElement.dataset.portfolioVariant = PORTFOLIO_VARIANT;
  }, []);

  return (
    <>
      <ScrollToTop />
      <ContactNudge />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/case/:slug" element={<CasePage />} />
        <Route path="/cv" element={<CvPage />} />
        {/* любой другой адрес — 404, а не пустой экран */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* ПОСЛЕ Routes: эффекты соседей срабатывают по порядку в дереве, а
          страницы (резюме, 404) правят document.title своими эффектами —
          стоя выше, счётчик отправлял бы хит с заголовком прошлой страницы */}
      <MetrikaHits />
    </>
  );
}

export default App;
