/**
 * Пережатие видео в public/ под веб: `npm run video:compress`.
 *
 * Зачем отдельным шагом, а не на каждой сборке: перекодирование VP9 идёт
 * минутами, а исходники меняются раз в несколько месяцев. Гонять его на каждый
 * `npm run build` — терять время на пустом месте.
 *
 * Что делает: находит ffmpeg, пережимает каждый .webm из public в VP9
 * (constant quality, две прохода не нужны — режим -crf без -b:v), сносит
 * звуковую дорожку (все видео на сайте немые лупы, дорожка в них — мёртвый вес)
 * и заменяет файл, только если он реально стал меньше. Оригинал уезжает в
 * assets-src/originals/ — репозиторий его не тащит (см. .gitignore), но
 * пережать заново из исходника всегда можно.
 *
 * Если ffmpeg не найден — предупреждаем и выходим с нулевым кодом, как это
 * делает cv-pdf.mjs с chrome: скрипт не должен ронять ничего вокруг.
 *   поставить: brew install ffmpeg
 */

import { spawn } from "node:child_process";
import { readdir, stat, rename, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(root, "public");
const ORIGINALS = resolve(root, "..", "assets-src", "originals");

// CRF для VP9: 30 — «хорошо» для экранного контента, 36 — заметно мягче и
// вдвое легче. Лупы на сайте мелкие (плитка ~2.2:1 в пол-колонки), поэтому
// можно не жадничать по качеству
const CRF = 34;
// потолок по ширине: плитки никогда не показываются шире ~1400 css-px,
// а 2x от этого — предел, дальше пиксели уходят в никуда.
// исходники приходили в 3300px — это в два с лишним раза больше нужного
const MAX_WIDTH = 1600;
// потолок по частоте кадров. главный виновник веса: motion.webm экспортировался
// в 100 fps — для стоп-моушена по цветной бумаге это бессмысленно, глазу хватает
// 30, а битрейт от лишних кадров растёт линейно. вниз никогда не тянем: если
// исходник 24 fps, так и оставляем (иначе ffmpeg надублирует кадры)
const MAX_FPS = 30;

function run(cmd, args) {
  return new Promise((done, fail) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", fail);
    p.on("exit", (code) =>
      code === 0 ? done(out) : fail(new Error(err.slice(-800))),
    );
  });
}

/** частота кадров исходника; null, если ffprobe не смог её назвать */
async function sourceFps(file) {
  try {
    const out = await run("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=r_frame_rate",
      "-of", "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    // ffprobe отдаёт дробью: «100/1», «30000/1001»
    const [num, den] = out.trim().split("/").map(Number);
    if (!num || !den) return null;
    return num / den;
  } catch {
    return null;
  }
}

async function hasFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

const kb = (n) => `${Math.round(n / 1024)} кб`;

async function main() {
  if (!(await hasFfmpeg())) {
    console.warn(
      "[video] ffmpeg не найден — видео не пережато.\n" +
        "        поставить: brew install ffmpeg",
    );
    return;
  }

  const files = (await readdir(PUBLIC)).filter((f) => extname(f) === ".webm");
  if (!files.length) {
    console.log("[video] в public нет видео");
    return;
  }

  await mkdir(ORIGINALS, { recursive: true });
  let saved = 0;

  for (const file of files) {
    const src = join(PUBLIC, file);
    const before = (await stat(src)).size;
    const out = join(PUBLIC, `${basename(file, extname(file))}.tmp.webm`);

    const fps = await sourceFps(src);
    const capFps = fps && fps > MAX_FPS;

    try {
      await run("ffmpeg", [
        "-y",
        "-i", src,
        // -2 держит чётную высоту (VP9 не любит нечётные) и сохраняет пропорции.
        // min() — чтобы узкое видео не растягивалось до MAX_WIDTH
        "-vf", `scale='min(${MAX_WIDTH},iw)':-2`,
        // -r только вниз: на исходнике медленнее MAX_FPS он бы надублировал кадры
        ...(capFps ? ["-r", String(MAX_FPS)] : []),
        "-c:v", "libvpx-vp9",
        "-crf", String(CRF),
        "-b:v", "0",
        "-row-mt", "1",
        // лупы немые — дорожка только весит
        "-an",
        out,
      ]);
    } catch (e) {
      console.warn(`[video] ${file}: ffmpeg упал, файл не тронут\n${e.message}`);
      if (existsSync(out)) await unlink(out);
      continue;
    }

    const after = (await stat(out)).size;
    if (after >= before) {
      // уже пережато или crf выбран мягче исходника — не портим файл
      console.log(`[video] ${file}: ${kb(before)} → ${kb(after)}, оставляем как было`);
      await unlink(out);
      continue;
    }

    // оригинал в assets-src (не в сборке), на его место — пережатый
    await rename(src, join(ORIGINALS, file));
    await rename(out, join(PUBLIC, `${basename(file, extname(file))}.webm`));
    saved += before - after;
    const note = capFps ? `, ${Math.round(fps)} → ${MAX_FPS} fps` : "";
    console.log(`[video] ${file}: ${kb(before)} → ${kb(after)}${note}`);
  }

  console.log(`[video] итого сэкономлено ${kb(saved)}; оригиналы в assets-src/originals/`);
  console.log("[video] постеры пересоберите после этого: npm run posters");
}

await main();
