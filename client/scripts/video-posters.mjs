/**
 * Сборка постеров для видео из public/ → public/posters/*.webp. По умолчанию
 * постер — первый кадр; исключения перечислены в SEEK_AT_RATIO.
 *
 * Зачем: у <video> с постером на месте картинки сразу стоит кадр, а не пустой
 * прямоугольник, — и вместе с preload="metadata" браузер (особенно мобильный,
 * где автоплей часто отложен или запрещён в экономии трафика) не обязан тянуть
 * весь файл, чтобы показать хоть что-то.
 *
 * Как работает: поднимает статику public на свободном порту, открывает страницу
 * в headless-chrome, отматывает каждое видео на нужный кадр, рисует его в canvas
 * и кодирует в webp прямо в браузере (canvas.toDataURL). ffmpeg не нужен, кодек
 * webm берётся из самого chrome. Соответствие «видео → постер» задаётся
 * posterFor() в src/lib/media.ts — тем же правилом имени.
 *
 * Запуск: `npm run posters` (после добавления нового видео в public).
 * Зависимостей нет; chrome ищется среди уже установленных — как в cv-pdf.mjs.
 * Если chrome не найден, скрипт предупреждает и выходит с нулевым кодом, чтобы
 * не ронять сборку: прежние постеры в public остаются на месте.
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, readdir, mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(root, "public");
const OUT_DIR = join(PUBLIC, "posters");
// постер — заглушка на первые мгновения, а не самостоятельная картинка: жмём
// сильнее остальных webp в проекте и не тащим кадр в исходном разрешении.
//
// 1800px/0.7 давали 150 кб на «шумных» кадрах (стоп-моушен по цветной бумаге —
// зерно, которое webp не сжимает). А постер грузится СРАЗУ, в отличие от самого
// видео: оно теперь ждёт IntersectionObserver (см. components/LazyVideo.tsx),
// и получалось, что заглушка весит больше, чем экономия от ленивой загрузки.
// 1200px — всё ещё 1.35x от самой широкой колонки (889px), а видео поверх
// постера появляется через доли секунды, так что запас на retina тут не нужен
const QUALITY = 0.62;
const MAX_WIDTH = 1200;
const SEEK_TO = 0.05; // с; ровно 0 некоторые контейнеры отдают пустым кадром

// исключения из «постер = первый кадр»: доля длительности вместо SEEK_TO.
// Плакаты в разделе «для души» рисуют сами себя с пустого холста, и первым
// кадром у них голый фон — до того, как видео доедет, плитка выглядит битой.
// Берём конец анимации: там собранная работа, ровно как в макете
const SEEK_AT_RATIO = {
  "gabdula.webm": 0.98,
  "flowers.webm": 0.98,
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** первый существующий путь из списка */
function firstExisting(paths) {
  return paths.find((p) => p && existsSync(p));
}

/** сборки chrome, скачанные puppeteer (~/.cache/puppeteer/<канал>/<версия>/…) */
async function puppeteerChromes() {
  const cache = join(homedir(), ".cache", "puppeteer");
  const found = [];
  for (const channel of ["chrome", "chrome-headless-shell"]) {
    const dir = join(cache, channel);
    if (!existsSync(dir)) continue;
    for (const version of await readdir(dir)) {
      const base = join(dir, version);
      for (const build of existsSync(base) ? await readdir(base) : []) {
        found.push(
          join(base, build, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
          join(base, build, "chrome"),
          join(base, build, "chrome-headless-shell"),
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
  ]);
}

/** статика public на случайном свободном порту */
async function serve() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (path === "/") {
      res.writeHead(200, { "content-type": MIME[".html"] });
      res.end("<!doctype html><meta charset=utf-8><title>posters</title>");
      return;
    }
    try {
      const body = await readFile(join(PUBLIC, path));
      res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

/** минимальный CDP-клиент поверх WebSocket */
async function connect(port) {
  let version;
  for (let i = 0; i < 80; i++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!version) throw new Error("chrome не поднялся");
  const sock = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (sock.onopen = r));
  let id = 0;
  const pending = new Map();
  sock.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((res) => {
      const mid = ++id;
      pending.set(mid, res);
      sock.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  return { sock, send };
}

const videos = (await readdir(PUBLIC)).filter((f) => /\.(webm|mp4)$/.test(f));
if (!videos.length) {
  console.log("постеры: видео в public не найдены — пропускаю");
  process.exit(0);
}

const chromePath = await findChrome();
if (!chromePath) {
  console.warn("постеры: chrome не найден — пропускаю (прежние постеры остаются)");
  process.exit(0);
}

const { server, port: httpPort } = await serve();
const profile = await mkdtemp(join(tmpdir(), "posters-"));
const devtoolsPort = 9400 + (process.pid % 500);
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--remote-debugging-port=${devtoolsPort}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--autoplay-policy=no-user-gesture-required",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let failures = 0;
try {
  const { sock, send } = await connect(devtoolsPort);
  const { result: { targetId } } = await send("Target.createTarget", {
    url: `http://127.0.0.1:${httpPort}/`,
  });
  const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await mkdir(OUT_DIR, { recursive: true });

  for (const file of videos) {
    const url = `http://127.0.0.1:${httpPort}/${file}`;
    const ratio = SEEK_AT_RATIO[file];
    const seek = ratio ? `v.duration * ${ratio}` : String(SEEK_TO);
    const expr = `
      (async () => {
        const v = document.createElement("video");
        // не отдаём видео по http, а сначала тянем файл целиком в blob: наша
        // статика не умеет Range, и по сети chrome считает такой ресурс
        // неперематываемым — любой seek схлопывается в нулевой кадр.
        // blob-урл лежит в памяти и перематывается куда угодно
        const blob = await (await fetch(${JSON.stringify(url)})).blob();
        v.src = URL.createObjectURL(blob);
        v.muted = true;
        v.preload = "auto";
        await new Promise((ok, bad) => {
          v.onloadeddata = ok;
          v.onerror = () => bad(new Error("видео не открылось"));
        });
        await new Promise((ok) => { v.onseeked = ok; v.currentTime = ${seek}; });
        const scale = Math.min(1, ${MAX_WIDTH} / v.videoWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(v.videoWidth * scale);
        c.height = Math.round(v.videoHeight * scale);
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(v, 0, 0, c.width, c.height);
        return JSON.stringify({
          w: c.width,
          h: c.height,
          data: c.toDataURL("image/webp", ${QUALITY}),
        });
      })()
    `;
    const res = await send(
      "Runtime.evaluate",
      { expression: expr, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    const value = res.result?.result?.value;
    if (res.result?.exceptionDetails || typeof value !== "string") {
      console.warn(`постеры: ${file} — кадр не снялся, пропускаю`);
      failures++;
      continue;
    }
    const { w, h, data } = JSON.parse(value);
    if (!data.startsWith("data:image/webp")) {
      console.warn(`постеры: ${file} — chrome не отдал webp, пропускаю`);
      failures++;
      continue;
    }
    const out = join(OUT_DIR, `${file.replace(/\.(webm|mp4)$/, "")}.webp`);
    const bytes = Buffer.from(data.split(",")[1], "base64");
    await writeFile(out, bytes);
    console.log(`постеры: ${file} → posters/${file.replace(/\.(webm|mp4)$/, "")}.webp  ${w}×${h}, ${Math.round(bytes.length / 1024)} КБ`);
  }
  sock.close();
} finally {
  // профиль удаляем только после того, как chrome закрылся: живой процесс
  // продолжает писать в него, и rmdir падает на непустой папке
  const exited = new Promise((r) => chrome.once("exit", r));
  chrome.kill();
  await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
  server.close();
  // временный профиль — не повод ронять скрипт, постеры уже записаны
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

process.exit(failures && failures === videos.length ? 1 : 0);
