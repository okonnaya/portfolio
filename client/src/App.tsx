import { useEffect, useState } from "react";

const COUNT = 10;
const SIZE = 30; // диаметр кружка, px
const COLORS = ["#FFE100", "#FF4DA2", "#00D9FF", "#FF2640"];

type Circle = { x: number; y: number; color: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generate(width: number, height: number): Circle[] {
  // равномерно по цветам: по 25 каждого, затем перемешиваем
  const palette = shuffle(
    Array.from({ length: COUNT }, (_, i) => COLORS[i % COLORS.length])
  );

  // сетка 10x10 на весь экран — соседи не дальше ~1 ячейки друг от друга
  const cols = Math.ceil(Math.sqrt(COUNT));
  const rows = Math.ceil(COUNT / cols);
  const cellW = width / cols;
  const cellH = height / rows;

  return Array.from({ length: COUNT }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // случайное положение в пределах всей ячейки: крайние кружки
    // могут залезать за верх / лево / право экрана
    const x = col * cellW + Math.random() * cellW - SIZE / 2;
    let y = row * cellH + Math.random() * cellH - SIZE / 2;
    // низ не пересекаем
    if (y + SIZE > height) y = height - SIZE;
    return { x, y, color: palette[i] };
  });
}

function App() {
  const [circles, setCircles] = useState<Circle[]>([]);

  useEffect(() => {
    setCircles(generate(window.innerWidth, window.innerHeight));
  }, []);

  return (
    <main>
      {circles.map((c, i) => (
        <span
          key={i}
          className="circle"
          style={{
            left: c.x,
            top: c.y,
            width: SIZE,
            height: SIZE,
            background: c.color,
          }}
        />
      ))}
    </main>
  );
}

export default App;
