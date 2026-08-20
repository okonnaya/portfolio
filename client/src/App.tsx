import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { CasePage } from "./components/CasePage";
import { CvPage } from "./components/CvPage";
import { Home } from "./components/Home";
import { NotFound } from "./components/NotFound";

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

/** Роутинг: главная, страница отдельного кейса (по клику на медиа) и резюме. */
function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/case/:slug" element={<CasePage />} />
        <Route path="/cv" element={<CvPage />} />
        {/* любой другой адрес — 404, а не пустой экран */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
