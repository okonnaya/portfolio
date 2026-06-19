import { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas } from "./components/Canvas";
import { Hero } from "./components/Hero";
import { createField } from "./sketches/field";
import { createBigGlow } from "./sketches/bigGlow";

// множитель прозрачности фоновых слоёв по величине скролла: 1 наверху, 0 примерно
// на 0.6 экрана вниз (гасим «повыше», не за полный экран)
const fadeFactor = () =>
  Math.max(0, Math.min(1, 1 - window.scrollY / (window.innerHeight * 0.6)));

function App() {
  const field = useMemo(() => createField(), []);
  const glow = useMemo(() => createBigGlow(), []);

  // --bg-fade гасит поле/направляющие/свечение/нижние тексты ПО ВЕЛИЧИНЕ скролла и
  // НЕ возвращается при скролле вверх: фактор монотонно убывает (minFade). то есть
  // проскроллил вниз — эффекты ушли и наверху сами не появятся. вернуть их может
  // только новый ховер/клик через rearm() — тогда минимум сбрасывается и фактор
  // снова считается от текущего скролла (наверху = 1), всё проявляется как при загрузке.
  const minFade = useRef(1);

  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      raf = 0;
      minFade.current = Math.min(minFade.current, fadeFactor());
      root.style.setProperty("--bg-fade", String(minFade.current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // «перезарядка»: ховер/клик снимают накопленный минимум — фактор пересчитывается
  // от текущего скролла (наверху = 1), и эффекты появляются заново, как при загрузке
  const rearm = useCallback(() => {
    minFade.current = fadeFactor();
    document.documentElement.style.setProperty(
      "--bg-fade",
      String(minFade.current),
    );
  }, []);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100%",
      }}
    >
      <Canvas
        sketch={field.sketch}
        resolution={0.5} // всегда под blur(20px) — половинного разрешения хватает
        style={{
          position: "fixed",
          inset: 0,
          // canvas — replaced-элемент: inset:0 его НЕ растягивает, нужен явный
          // размер, иначе он падает на интринсик 300×150 в углу. 100% (а не
          // 100vw) — чтобы не ловить гор. скролл от вертикального скроллбара
          width: "100%",
          height: "100%",
          opacity: "var(--bg-fade, 1)", // гаснет по величине скролла
          zIndex: -1,
        }}
      />

      {/* блюр сверху: сильный у кромки, плавно сходит вниз через маску */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "100vh",
          pointerEvents: "none",
          zIndex: 0,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          // maskImage:
          //   "linear-gradient(to bottom, black 0%, black 35%, transparent 100%)",
          // WebkitMaskImage:
          //   "linear-gradient(to bottom, black 0%, black 35%, transparent 100%)",
        }}
      />

      {/* свечение #FEAAFF поверх блюра. plus-lighter: над белым (в покое, когда
          поля нет) невидимо, а поверх проявившегося поля красиво подсвечивает
          его — тот самый градиент. гаснет по скроллу вместе с полем */}
      <Canvas
        sketch={glow}
        resolution={0.5} // мягкое свечение — низкое разрешение незаметно
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: "var(--bg-fade, 1)", // гаснет по величине скролла
          zIndex: 1,
          pointerEvents: "none",
          mixBlendMode: "plus-lighter",
        }}
      />

      <Hero onActiveChange={field.setActive} onRearm={rearm} />
    </main>
  );
}

export default App;
