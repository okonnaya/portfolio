import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../dist-ssr/entry-server.js";

const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(clientDir, "dist");
const template = await readFile(resolve(distDir, "index.html"), "utf8");

const routes = [
  "/",
  "/kinopoisk",
  "/cv",
  "/case/ai-component",
  "/case/search-button",
  "/case/ai-research-platform",
  "/case/emotions-space",
];

for (const route of routes) {
  const markup = render(route);
  const html = template.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
  const output =
    route === "/"
      ? resolve(distDir, "index.html")
      : resolve(distDir, route.slice(1), "index.html");

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html);
  console.log(`prerendered ${route} -> ${output}`);
}
