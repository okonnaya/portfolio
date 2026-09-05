/**
 * MP4-фолбэки для Safari: `npm run video:mp4`.
 *
 * Основной формат лупов на сайте — WebM/VP9, но Safari не всегда воспроизводит
 * такие файлы. Этот скрипт кладёт рядом с каждым public/*.webm одноимённый
 * public/*.mp4 в H.264, чтобы компонент мог отдать браузеру оба источника.
 */

import { spawn } from "node:child_process";
import { readdir, rename, stat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(root, "public");
const MAX_WIDTH = 1280;
const MAX_FPS = 30;
const CRF = 24;
const FORCE = process.env.FORCE_VIDEO_MP4 === "1";

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

async function sourceFps(file) {
  try {
    const out = await run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const [num, den] = out.trim().split("/").map(Number);
    if (!num || !den) return null;
    return num / den;
  } catch {
    return null;
  }
}

const kb = (n) => `${Math.round(n / 1024)} кб`;

async function main() {
  if (!(await hasFfmpeg())) {
    console.warn(
      "[video:mp4] ffmpeg не найден — MP4-фолбэки не собраны.\n" +
        "            поставить: brew install ffmpeg",
    );
    return;
  }

  const files = (await readdir(PUBLIC)).filter((f) => f.endsWith(".webm"));
  if (!files.length) {
    console.log("[video:mp4] в public нет webm-видео");
    return;
  }

  for (const file of files) {
    const src = join(PUBLIC, file);
    const out = join(PUBLIC, `${basename(file, ".webm")}.mp4`);
    const tmp = join(PUBLIC, `${basename(file, ".webm")}.tmp.mp4`);

    if (!FORCE && existsSync(out)) {
      const [srcStat, outStat] = await Promise.all([stat(src), stat(out)]);
      if (outStat.mtimeMs >= srcStat.mtimeMs) {
        console.log(`[video:mp4] ${file}: уже есть`);
        continue;
      }
    }

    const fps = await sourceFps(src);
    const capFps = fps && fps > MAX_FPS;

    try {
      await run("ffmpeg", [
        "-y",
        "-i",
        src,
        "-vf",
        `scale='min(${MAX_WIDTH},iw)':-2`,
        ...(capFps ? ["-r", String(MAX_FPS)] : []),
        "-c:v",
        "libx264",
        "-profile:v",
        "main",
        "-level",
        "4.1",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        String(CRF),
        "-preset",
        "medium",
        "-movflags",
        "+faststart",
        "-an",
        tmp,
      ]);
      await unlink(out).catch(() => {});
      await rename(tmp, out);
    } catch (e) {
      console.warn(`[video:mp4] ${file}: ffmpeg упал\n${e.message}`);
      if (existsSync(tmp)) await unlink(tmp);
      continue;
    }

    const size = (await stat(out)).size;
    const note = capFps ? `, ${Math.round(fps)} → ${MAX_FPS} fps` : "";
    console.log(`[video:mp4] ${file}: ${kb(size)}${note}`);
  }
}

await main();
