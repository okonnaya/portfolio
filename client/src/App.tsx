import { useMemo } from "react";
import { Canvas } from "./components/Canvas";
import { createField } from "./sketches/field";
import { createBigGlow } from "./sketches/bigGlow";

function App() {
  const sketch = useMemo(() => createField(), []);
  const glow = useMemo(() => createBigGlow(), []);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100%",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <Canvas
        sketch={sketch}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
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

      {/* крупное свечение #FEAAFF поверх блюра, со своим отдельным размытием */}
      <Canvas
        sketch={glow}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1,
          pointerEvents: "none",
          // высветляет и нижние слои (а не только перекрытия внутри свечения)
          mixBlendMode: "plus-lighter",
        }}
      />
    </main>
  );
}

export default App;
