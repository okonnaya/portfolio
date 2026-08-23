/**
 * Сборка client/public/og.jpg — картинки-превью, которую телеграм, слак и
 * твиттер показывают, когда кто-то кидает ссылку на портфолио.
 *
 * Зачем переделали: раньше og.jpg был коллажем скриншотов кейса. В карточке он
 * читался как «какой-то интерфейс» — ни имени, ни роли, а ссылку на портфолио
 * рекрутер пересылает коллегам, и карточка часто единственное, что видят до
 * клика. Плюс на скриншотах были ФИО и данные из рабочего проекта.
 *
 * Как работает: та же механика, что у cv-pdf.mjs — поднимаем статику public на
 * свободном порту (нужен шрифт из /fonts и аватар), отдаём на / вёрстку карточки
 * ниже, снимаем headless-chrome'ом в 1200×630 и конвертируем в jpeg через sips.
 * 1200×630 — соотношение 1.91:1, его скрейперы показывают без обрезки.
 *
 * Запуск: только вручную, `npm run og`. Из `npm run build` скрипт убран
 * намеренно: og.jpg лежит в public как обычная картинка и правится руками, а
 * автозапуск на каждой сборке затирал бы её этой сгенерённой карточкой.
 * Если chrome не найден — предупреждаем и выходим с нулевым кодом: в public
 * останется прежний og.jpg.
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, stat, rm, mkdtemp, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(root, "public");
const OUT_JPG = join(PUBLIC, "og.jpg");

const WIDTH = 1200;
const HEIGHT = 630;

// Текст карточки. Держим здесь, а не тянем из компонентов: og-превью — не
// страница сайта, у него своя, более «представительская» задача, и трогать его
// приходится реже. Если правите — правьте и og:description в index.html.
const NAME = "карина рамазанова";
const ROLE = "продуктовый дизайнер";
const NOW = "сейчас исследую в инфре яндекса";
const TAGS = "ии-решения в b2e · продуктовые метрики · личные проекты";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

/* Вёрстка карточки повторяет первый экран сайта: слева имя чёрным с выключкой
   вправо, справа роль приглушённым с выключкой влево — та же двухколоночная
   композиция, что в hero. Никаких скриншотов продуктов: только типографика,
   чтобы карточка читалась в мелком превью и не тащила рабочие интерфейсы. */
const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8" />
<style>
  @font-face {
    font-family: "PP Neue Montreal";
    src: url("/fonts/PPNeueMontreal-Variable.woff2") format("woff2");
    font-weight: 100 900;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    background: #fff; color: #0e0e0e;
    font-family: "PP Neue Montreal", -apple-system, Helvetica, sans-serif;
    font-weight: 500; letter-spacing: -0.01em;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 72px;
    -webkit-font-smoothing: antialiased;
  }
  .top { display: flex; align-items: center; gap: 16px; font-size: 24px; }
  .avatar { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(0,0,0,.4); }
  .muted { color: rgba(0,0,0,.4); font-weight: 400; }
  /* сетка как в hero: 1fr | 1fr, выключка к центру */
  .mid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px;
         align-items: start; line-height: .85; font-size: 78px; }
  .mid .l { text-align: right; }
  .mid .r { text-align: left; }
  .bottom { font-size: 22px; font-weight: 400; color: rgba(0,0,0,.62); }
</style></head>
<body>
  <div class="top">
    <img class="avatar" src="/avatar.jpeg" alt="" />
    <span class="muted">${NOW}</span>
  </div>
  <div class="mid">
    <div class="l">${NAME.replace(" ", "<br />")}</div>
    <div class="r muted">${ROLE.replace(" ", "<br />")}</div>
  </div>
  <div class="bottom">${TAGS}</div>
</body></html>`;

/** статика public; на / отдаём вёрстку карточки */
function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": MIME[".html"] });
      res.end(html);
      return;
    }
    const file = join(PUBLIC, decodeURIComponent(url.pathname));
    if (!file.startsWith(PUBLIC) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
    });
    res.end(await readFile(file));
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function firstExisting(paths) {
  for (const p of paths) if (p && existsSync(p)) return p;
  return null;
}

/** сборки chrome, скачанные puppeteer (~/.cache/puppeteer/<канал>/<версия>/…) */
async function puppeteerChromes() {
  const cache = join(homedir(), ".cache", "puppeteer");
  const found = [];
  for (const channel of ["chrome-headless-shell", "chrome"]) {
    const dir = join(cache, channel);
    if (!existsSync(dir)) continue;
    for (const version of await readdir(dir)) {
      const base = join(dir, version);
      for (const build of existsSync(base) ? await readdir(base) : []) {
        found.push(
          join(base, build, "chrome-headless-shell"),
          join(base, build, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
          join(base, build, "chrome"),
        );
      }
    }
  }
  return found;
}

async function findChrome() {
  return firstExisting([
    process.env.CHROME_PATH,
    ...(await puppeteerChromes()),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]);
}

function run(cmd, args) {
  return new Promise((done) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    const timer = setTimeout(() => p.kill("SIGKILL"), 90_000);
    p.stderr.on("data", (d) => (err += d));
    p.on("error", () => {
      clearTimeout(timer);
      done({ code: 1, err: "не запустился" });
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      done({ code, err });
    });
  });
}

async function main() {
  const chrome = await findChrome();
  if (!chrome) {
    console.warn(
      "[og] chrome не найден — og.jpg не пересобран (остался прежний).\n" +
        "     поставить: npx puppeteer browsers install chrome-headless-shell",
    );
    return;
  }

  const server = await serve();
  const { port } = server.address();
  // чистый профиль: иначе chrome берёт шрифт и аватар из своего кеша (их урлы
  // не версионируются) и карточка собирается из старых файлов
  const profile = await mkdtemp(join(tmpdir(), "og-"));
  const tmpPng = join(profile, "og.png");

  const { code, err } = await run(chrome, [
    ...(chrome.includes("chrome-headless-shell") ? [] : ["--headless=new"]),
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    "--force-device-scale-factor=2", // ретина: текст в превью не должен мылить
    "--virtual-time-budget=5000", // даём догрузиться шрифту и аватару
    `--screenshot=${tmpPng}`,
    `http://127.0.0.1:${port}/`,
  ]);
  server.close();

  if (code !== 0 || !existsSync(tmpPng)) {
    console.warn("[og] снять карточку не удалось:", err.trim().split("\n").slice(-2).join(" "));
    await rm(profile, { recursive: true, force: true });
    return;
  }

  // png → jpg: у карточки плашка белого фона, jpeg на ней легче, а имя og.jpg
  // уже прописано в index.html. sips есть в macos из коробки; если его нет —
  // кладём png рядом и просим поправить мету, чтобы не оставить битую ссылку
  // снимали в 2x ради антиалиасинга, а кладём в объявленные 1200×630: скрейперы
  // показывают превью шириной ~500px, так что 1200 — уже с запасом, а 2400px
  // jpeg на мелком тексте весил втрое больше без выигрыша в виде
  const sips = await run("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", "88",
    "-Z", String(WIDTH),
    tmpPng, "--out", OUT_JPG,
  ]);
  if (sips.code !== 0) {
    const pngOut = join(PUBLIC, "og.png");
    await rename(tmpPng, pngOut);
    console.warn(
      "[og] sips недоступен — положил og.png. Поправьте og:image в index.html " +
        "или сконвертируйте файл вручную",
    );
    await rm(profile, { recursive: true, force: true });
    return;
  }

  await rm(profile, { recursive: true, force: true });
  const { size } = await stat(OUT_JPG);
  console.log(`[og] og.jpg собран, ${Math.round(size / 1024)} кб`);
}

await main();
