// Bundles the editor into one HTML file (assets referenced from ./templates).
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
<title>Bookling Editor</title><link rel="stylesheet" href="${fontHref}"><style>${css}</style></head>
<body><div id="root"></div><script>${out.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
mkdirSync(path.join(root, "dist"), { recursive: true });
writeFileSync(path.join(root, "dist/index.html"), html);
// Artifact flavour: the host adds the html/head/body skeleton itself.
const artifact = `<title>Bookling Editor</title><link rel="stylesheet" href="${fontHref}"><style>${css}</style><div id="root"></div><script>${out.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>`;
writeFileSync(path.join(root, "dist/artifact.html"), artifact);
console.log("dist/index.html", (html.length / 1024).toFixed(0) + " KB");
