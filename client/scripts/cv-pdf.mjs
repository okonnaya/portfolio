/**
 * Сборка client/public/cv.pdf из страницы /cv — чтобы кнопка «скачать» отдавала
 * файл сразу, без диалога печати, и при этом файл не расходился с вёрсткой.
 *
 * Как работает: поднимает статику собранного dist на свободном порту, печатает
 * /cv в pdf через headless-chrome (тот же движок, что и в диалоге печати, то
 * есть внешний вид задаёт @media print в CvPage.css), кладёт результат в dist
 * и в public. Запускается сам в конце `npm run build`, отдельно — `npm run
 * cv:pdf` (нужен уже собранный dist).
 *
 * Зависимостей нет: статику отдаёт node, chrome ищется среди уже установленных.
 * Если chrome не найден — предупреждаем и выходим с нулевым кодом, чтобы не
 * ронять сборку: в dist останется прежний cv.pdf из public.
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, copyFile, stat, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "dist");
const OUT_DIST = join(DIST, "cv.pdf");
const OUT_PUBLIC = join(root, "public", "cv.pdf");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

/** статика dist с spa-фолбэком на index.html (маршрут /cv — клиентский) */
function serveDist() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let file = join(DIST, decodeURIComponent(url.pathname));
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    if (!extname(file) || !existsSync(file)) file = join(DIST, "index.html");
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

/** первый существующий путь из списка */
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
          join(base, build, "chrome")
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

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.warn("[cv-pdf] нет dist — сначала `npm run build`");
    return;
  }

  const chrome = await findChrome();
  if (!chrome) {
    console.warn(
      "[cv-pdf] chrome не найден — cv.pdf не пересобран (в dist остался прежний).\n" +
        "         поставить: npx puppeteer browsers install chrome-headless-shell\n" +
        "         или указать путь: CHROME_PATH=/path/to/chrome npm run cv:pdf"
    );
    return;
  }

  const server = await serveDist();
  const { port } = server.address();
  // чистый профиль на каждый запуск: иначе chrome отдаёт шрифт и аватар из
  // своего кеша (их урлы не версионируются) и pdf может собраться из старых
  // файлов. плюс не конфликтуем с уже открытым браузером пользователя,
  // если CHROME_PATH указывает на обычный chrome
  const profile = await mkdtemp(join(tmpdir(), "cv-pdf-"));
  const args = [
    // chrome-headless-shell headless сам по себе, полному chrome нужен флаг
    ...(chrome.includes("chrome-headless-shell") ? [] : ["--headless=new"]),
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${profile}`,
    "--no-pdf-header-footer",
    // даём догрузиться шрифту и аватару перед печатью
    "--virtual-time-budget=5000",
    `--print-to-pdf=${OUT_DIST}`,
    `http://127.0.0.1:${port}/cv`,
  ];

  // некоторые сборки chrome в headless на macos просто зависают — не держим
  // из-за этого сборку бесконечно
  const TIMEOUT_MS = 90_000;
  const code = await new Promise((ok) => {
    const p = spawn(chrome, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    const timer = setTimeout(() => {
      console.warn(`[cv-pdf] chrome не ответил за ${TIMEOUT_MS / 1000}с — прерываю`);
      p.kill("SIGKILL");
    }, TIMEOUT_MS);
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (c) => {
      clearTimeout(timer);
      if (c !== 0) console.warn("[cv-pdf] chrome:", err.trim().split("\n").slice(-2).join(" "));
      ok(c);
    });
  });
  server.close();
  await rm(profile, { recursive: true, force: true });

  if (code !== 0 || !existsSync(OUT_DIST)) {
    console.warn("[cv-pdf] печать не удалась — cv.pdf не пересобран");
    return;
  }

  await mkdir(dirname(OUT_PUBLIC), { recursive: true });
  await copyFile(OUT_DIST, OUT_PUBLIC); // чтобы файл отдавался и в дев-режиме
  const { size } = await stat(OUT_DIST);
  console.log(`[cv-pdf] cv.pdf собран, ${Math.round(size / 1024)} кб`);
}

await main();
