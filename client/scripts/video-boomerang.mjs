/**
 * «Бумеранг» для коротких лупов: `npm run video:boomerang`.
 *
 * Что это: у <video> нет обратного воспроизведения — playbackRate не бывает
 * отрицательным, а отматывать currentTime из requestAnimationFrame значит
 * гонять сотни обратных сиков по VP9 (и делать это одновременно для всех
 * лупов блока «для души»). Поэтому реверс запекаем в файл: forward + reverse
 * в одной дорожке, дальше обычный атрибут loop даёт бесконечное
 * «туда-обратно» без единой строчки js.
 *
 * Почему отдельным шагом, а не на сборке: как и video-compress.mjs, это
 * минуты перекодирования VP9 при исходниках, которые меняются раз в
 * несколько месяцев.
 *
 * Только короткие лупы (см. TARGETS): склейка удваивает и вес, и длину цикла,
 * а на пятнадцатисекундном видео полминутный цикл уже не читается как приём.
 *
 * Идемпотентность: в готовый файл пишется тег comment=boomerang, и повторный
 * запуск такие файлы пропускает — иначе второй прогон дал бы
 * forward+reverse+reverse+forward.
 *
 * Файл в public заменяется, предыдущая версия уезжает в
 * assets-src/originals/loops/ (репозиторий её не тащит, см. .gitignore).
 * Первый кадр не меняется, поэтому постеры (npm run posters) пересобирать не нужно.
 *
 * Если ffmpeg не найден — предупреждаем и выходим с нулевым кодом, как это
 * делают cv-pdf.mjs и video-compress.mjs: скрипт не должен ронять сборку.
 *   поставить: brew install ffmpeg
 */

import { spawn } from "node:child_process";
import { stat, rename, mkdir, unlink, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(root, "public");
const ORIGINALS = resolve(root, "..", "assets-src", "originals", "loops");

// какие лупы разворачиваем. Длинные diary.webm и yamusic.webm тут намеренно
// отсутствуют: 15 с × 2 = полминуты цикла и лишние ~3,4 МБ веса
const TARGETS = ["flowers.webm", "gabdula.webm", "motion.webm"];

// тот же CRF, что у video-compress.mjs: файл в public уже пережат, и склейка —
// это вторая генерация VP9, мягчить её сильнее нет смысла
const CRF = 34;
// метка в теге comment: по ней узнаём уже развёрнутый файл
const MARK = "boomerang";

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

async function hasFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

/** уже бумеранг? читаем теги контейнера */
async function isBoomerang(file) {
  try {
    const out = await run("ffprobe", [
      "-v", "error",
      "-show_entries", "format_tags",
      "-of", "default=noprint_wrappers=1",
      file,
    ]);
    return out.toLowerCase().includes(MARK);
  } catch {
    return false;
  }
}

/** число кадров в дорожке; null, если ffprobe его не назвал */
async function frameCount(file) {
  try {
    const out = await run("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      // nb_frames у webm обычно пустой, поэтому считаем кадры пакетами
      "-count_packets",
      "-show_entries", "stream=nb_read_packets",
      "-of", "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const n = Number(out.trim());
    return Number.isFinite(n) && n > 1 ? n : null;
  } catch {
    return null;
  }
}

const kb = (n) => `${Math.round(n / 1024)} кб`;

/**
 * Фильтр склейки. Развёрнутая копия обрезается с двух краёв на кадр:
 * без этого крайние кадры показывались бы дважды подряд — на развороте
 * (конец forward = первый кадр reverse) и на стыке цикла (последний кадр
 * reverse = начало forward), и луп заметно «спотыкался» бы в этих точках.
 */
function filter(frames) {
  const trim = frames
    ? `trim=start_frame=1:end_frame=${frames - 1},`
    : "trim=start_frame=1,";
  return `[0:v]split[a][b];[b]reverse,${trim}setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[out]`;
}

async function main() {
  if (!(await hasFfmpeg())) {
    console.warn(
      "[boomerang] ffmpeg не найден — видео не тронуты.\n" +
        "            поставить: brew install ffmpeg",
    );
    return;
  }

  await mkdir(ORIGINALS, { recursive: true });
  let grew = 0;

  for (const file of TARGETS) {
    const src = join(PUBLIC, file);
    if (!existsSync(src)) {
      console.warn(`[boomerang] ${file}: нет в public — пропускаем`);
      continue;
    }
    if (await isBoomerang(src)) {
      console.log(`[boomerang] ${file}: уже развёрнут, пропускаем`);
      continue;
    }

    const before = (await stat(src)).size;
    const out = join(PUBLIC, `${basename(file, ".webm")}.tmp.webm`);
    const frames = await frameCount(src);

    try {
      await run("ffmpeg", [
        "-y",
        "-i", src,
        "-filter_complex", filter(frames),
        "-map", "[out]",
        "-c:v", "libvpx-vp9",
        "-crf", String(CRF),
        "-b:v", "0",
        "-row-mt", "1",
        "-an", // лупы немые
        "-metadata", `comment=${MARK}`,
        out,
      ]);
    } catch (e) {
      console.warn(`[boomerang] ${file}: ffmpeg упал, файл не тронут\n${e.message}`);
      if (existsSync(out)) await unlink(out);
      continue;
    }

    const after = (await stat(out)).size;
    // предыдущую версию храним рядом с оригиналами: развернуть заново или
    // откатиться можно без перекодирования из исходника
    await copyFile(src, join(ORIGINALS, file));
    await rename(out, src);
    grew += after - before;
    console.log(
      `[boomerang] ${file}: ${kb(before)} → ${kb(after)}` +
        (frames ? `, ${frames} кадров → ${frames * 2 - 2}` : ""),
    );
  }

  console.log(
    `[boomerang] итого +${kb(grew)}; версии до склейки в assets-src/originals/loops/`,
  );
}

await main();
