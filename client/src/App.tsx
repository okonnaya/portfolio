import { useMemo } from "react";
import { Canvas } from "./components/Canvas";
import { Hero } from "./components/Hero";
import { createCircles } from "./sketches/circles";

function App() {
  const circles = useMemo(() => createCircles(), []);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100%",
      }}
    >
      {/* большие круги ~10vh: появляются/пропадают на ховер/клик вразнобой,
          по скроллу уходят тем же стаггером (Hero дёргает setActive(false)) */}
      <Canvas
        sketch={circles.sketch}
        style={{
          position: "fixed",
          inset: 0,
          // canvas — replaced-элемент: inset:0 его НЕ растягивает, нужен явный
          // размер, иначе он падает на интринсик 300×150 в углу. 100% (а не
          // 100vw) — чтобы не ловить гор. скролл от вертикального скроллбара
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      <Hero onActiveChange={circles.setActive} />
    </main>
  );
}

export default App;
