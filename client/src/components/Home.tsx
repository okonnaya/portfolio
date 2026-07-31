import { useMemo } from "react";
import { Canvas } from "./Canvas";
import { Hero } from "./Hero";
import { Sections } from "./Sections";
import { createCircles } from "../sketches/circles";

/** Главная страница: фоновые круги + первый экран + блоки кейсов. */
export function Home() {
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
          // круги — самый верхний слой страницы: забивают собой и текст первого
          // экрана, и навбар hero (.hero__meta, z:3), и блоки кейсов
          // (.cases-page, z:2). Выше остаётся только лайтбокс галереи (z:100,
          // портал в body). Побочный эффект: hero-текст с mix-blend-mode:
          // difference больше не инвертируется по кругам (канвас не в его фоне) —
          // он блендится только с белой страницей
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      <Hero onActiveChange={circles.setActive} />
      <Sections />
    </main>
  );
}
