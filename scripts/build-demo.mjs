// Bundles the editor into one HTML file. dist/index.html loads the art from ./templates;
// dist/artifact.html carries the art inline so it works as a single file.
import { build } from "esbuild";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = await build({
  entryPoints: [path.join(root, "demo/entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  alias: { "@": root },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".tsx": "tsx", ".ts": "ts" },
  external: ["canvas"],
  logLevel: "warning",
});
const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
const fontHref =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Baloo+2:wght@400;700&family=Patrick+Hand&family=Comic+Neue:wght@400;700&family=Chewy&family=Quicksand:wght@400;700&family=Andika:wght@400;700&family=Lora:wght@400;700&family=Gaegu:wght@400;700&family=Atkinson+Hyperlegible:wght@400;700&display=swap";
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Book Builder Editor</title><link rel="stylesheet" href="${fontHref}"><style>${css}</style></head>
<body><div id="root"></div><script>${out.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
mkdirSync(path.join(root, "dist"), { recursive: true });
writeFileSync(path.join(root, "dist/index.html"), html);
// Artifact flavour: the host adds the html/head/body skeleton itself, and the art is inlined.
const assets = {};
for (const dir of ["backgrounds", "elements"]) {
  for (const f of readdirSync(path.join(root, "public/templates", dir))) {
    const mime = f.endsWith(".png") ? "image/png" : "image/jpeg";
    assets[`/templates/${dir}/${f}`] = `data:${mime};base64,${readFileSync(path.join(root, "public/templates", dir, f)).toString("base64")}`;
  }
}
const assetScript = `<script>globalThis.__ASSET_MAP__=${JSON.stringify(assets)}</script>`;
const artifact = `<title>Book Builder Editor</title><link rel="stylesheet" href="${fontHref}"><style>${css}</style><div id="root"></div>${assetScript}<script>${out.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>`;
writeFileSync(path.join(root, "dist/artifact.html"), artifact);
console.log("dist/index.html", (html.length / 1024).toFixed(0) + " KB;", "dist/artifact.html", (artifact.length / 1024 / 1024).toFixed(1) + " MB");
