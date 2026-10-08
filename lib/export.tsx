"use client";
import { createRoot } from "react-dom/client";
import { createRef } from "react";
import type Konva from "konva";
import { jsPDF } from "jspdf";
import PageStage from "@/components/editor/PageStage";
import { BLEED_IN, Book, Page, fillTokens, pageDims } from "./book";
import { loadImage } from "./images";

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/** Render one page off-screen and return a JPEG data URL at the requested DPI. */
export async function renderPage(book: Book, page: Page, dpi: number, watermark: boolean): Promise<string> {
  const d = pageDims(book.trim);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none;";
  document.body.appendChild(host);
  const ref = createRef<Konva.Stage>();
  const root = createRoot(host);
  try {
    const srcs = [
      page.background,
      ...page.elements.map((e) => (e.type === "image" ? (e.slot === "heroPhoto" && book.hero?.photo ? book.hero.photo : e.src) : undefined)),
    ].filter(Boolean) as string[];
    await Promise.allSettled(srcs.map(loadImage));
    await document.fonts?.ready;
    root.render(<PageStage ref={ref} book={book} page={page} scale={1} watermark={watermark} />);
    for (let i = 0; i < 4; i++) await frame();
    await new Promise((r) => setTimeout(r, 80));
    const pixelRatio = (d.fullW * dpi) / d.width;
    return ref.current!.toDataURL({ mimeType: "image/jpeg", quality: 0.86, pixelRatio });
  } finally {
    root.unmount();
    host.remove();
  }
}

export interface InteriorOptions {
  dpi: number; // 300 for print, 150 for screen
  watermark: boolean;
  padTo?: number; // add blank pages at the end to reach this count (binding rules)
  onProgress?: (done: number, total: number) => void;
}

/** Interior PDF: every page at full-bleed size (trim + 0.125" each side), the format KDP, IngramSpark and Lulu ask for. */
export async function buildInteriorPdf(book: Book, opts: InteriorOptions): Promise<Blob> {
  const d = pageDims(book.trim);
  const orient = d.fullW > d.fullH ? "landscape" : "portrait";
  const total = Math.max(book.pages.length, opts.padTo ?? 0);
  const pdf = new jsPDF({ unit: "in", format: [d.fullW, d.fullH], orientation: orient, compress: true });
  for (let i = 0; i < total; i++) {
    if (i > 0) pdf.addPage([d.fullW, d.fullH], orient);
    const page = book.pages[i];
    if (page) pdf.addImage(await renderPage(book, page, opts.dpi, opts.watermark), "JPEG", 0, 0, d.fullW, d.fullH, undefined, "FAST");
    else {
      pdf.setFillColor("#FFFFFF");
      pdf.rect(0, 0, d.fullW, d.fullH, "F");
    }
    opts.onProgress?.(i + 1, total);
  }
  pdf.setProperties({ title: book.title, author: book.author, creator: "Book Builder" });
  return pdf.output("blob");
}

export async function exportInteriorPdf(book: Book, opts: InteriorOptions) {
  download(await buildInteriorPdf(book, opts), `${slug(book.title)}-interior.pdf`);
}

// KDP premium-color spine: page count × 0.002347 in (check KDP's calculator before upload).
export function spineWidthIn(pageCount: number) {
  return Math.max(0.06, pageCount * 0.002347);
}

export interface CoverSpec {
  widthIn: number; // whole spread incl. bleed/wrap
  heightIn: number;
  spineIn: number;
  blurb?: string;
}

/** Cover spread: back | spine | front, built from the book's cover page. Works for KDP and Lulu sizes. */
export async function buildCoverPdf(book: Book, spec: CoverSpec): Promise<Blob> {
  const d = pageDims(book.trim);
  const dpi = 300;
  const front = await loadImage(await renderPage(book, book.pages[0], dpi, false));
  const W = spec.widthIn, H = spec.heightIn, spine = spec.spineIn;
  const panel = (W - spine) / 2; // each of back and front, including bleed/wrap
  const c = document.createElement("canvas");
  c.width = Math.round(W * dpi);
  c.height = Math.round(H * dpi);
  const g = c.getContext("2d")!;
  g.fillStyle = book.pages[0].bgColor || "#FFFDF7";
  g.fillRect(0, 0, c.width, c.height);

  // Front: the cover page, scaled to fill the front panel (extra wrap shows more of the art).
  const fx = (panel + spine) * dpi, fw = panel * dpi, fh = H * dpi;
  const s = Math.max(fw / front.width, fh / front.height);
  const dw = front.width * s, dh = front.height * s;
  g.save();
  g.beginPath();
  g.rect(fx, 0, fw, fh);
  g.clip();
  g.drawImage(front, fx + (fw - dw) / 2, (fh - dh) / 2, dw, dh);
  g.restore();

  // Back: a soft wash of the front art + blurb.
  g.save();
  g.beginPath();
  g.rect(0, 0, panel * dpi, fh);
  g.clip();
  g.globalAlpha = 0.25;
  g.drawImage(front, (panel * dpi - dw) / 2, (fh - dh) / 2, dw, dh);
  g.globalAlpha = 0.82;
  g.fillStyle = "#FFFDF7";
  g.fillRect(0, 0, panel * dpi, fh);
  g.restore();
  const margin = (H - d.trim.h) / 2 + 0.5; // stay inside wrap + safe area
  g.fillStyle = "#2A363B";
  g.font = `${0.24 * dpi}px Fredoka, sans-serif`;
  const blurb = fillTokens(spec.blurb || `${book.title}${book.author ? " by " + book.author : ""}`, book.hero);
  wrapText(g, blurb, margin * dpi, (margin + 0.6) * dpi, (panel - margin * 2) * dpi, 0.36 * dpi);

  // Spine
  if (spine > 0) {
    g.fillStyle = book.hero?.favoriteColor ?? "#E84A5F";
    g.fillRect(panel * dpi, 0, spine * dpi, fh);
    if (spine >= 0.25) {
      g.save();
      g.translate((panel + spine / 2) * dpi, fh / 2);
      g.rotate(Math.PI / 2);
      g.fillStyle = "#fff";
      g.font = `${Math.min(spine * 0.55, 0.3) * dpi}px Fredoka, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(book.title, 0, 0);
      g.restore();
    }
  }
  const pdf = new jsPDF({ unit: "in", format: [W, H], orientation: W > H ? "landscape" : "portrait", compress: true });
  pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H, undefined, "FAST");
  return pdf.output("blob");
}

/** KDP-style paperback cover (bleed only, KDP spine formula). */
export async function exportCoverPdf(book: Book, blurb: string) {
  const d = pageDims(book.trim);
  const spine = spineWidthIn(Math.max(24, book.pages.length));
  const blob = await buildCoverPdf(book, { widthIn: d.trim.w * 2 + spine + BLEED_IN * 2, heightIn: d.trim.h + BLEED_IN * 2, spineIn: spine, blurb });
  download(blob, `${slug(book.title)}-cover.pdf`);
}

export async function exportPagePng(book: Book, page: Page, watermark: boolean) {
  const url = await renderPage(book, page, 150, watermark);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(book.title)}-page.jpg`;
  a.click();
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "book";
