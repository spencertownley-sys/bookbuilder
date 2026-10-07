"use client";
import { createRoot } from "react-dom/client";
import { createRef } from "react";
import type Konva from "konva";
import { jsPDF } from "jspdf";
import PageStage from "@/components/editor/PageStage";
import { Book, Page, pageDims } from "./book";
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
    const srcs = [page.background, ...page.elements.map((e) => (e.type === "image" ? e.src : undefined))].filter(Boolean) as string[];
    await Promise.allSettled(srcs.map(loadImage));
    await document.fonts?.ready;
    root.render(<PageStage ref={ref} book={book} page={page} scale={1} watermark={watermark} />);
    for (let i = 0; i < 4; i++) await frame();
    await new Promise((r) => setTimeout(r, 60));
    const pixelRatio = (d.fullW * dpi) / d.width;
    return ref.current!.toDataURL({ mimeType: "image/jpeg", quality: 0.92, pixelRatio });
  } finally {
    root.unmount();
    host.remove();
  }
}

export interface ExportOptions {
  dpi: number; // 300 for print, 150 for screen
  watermark: boolean;
  onProgress?: (done: number, total: number) => void;
}

/** Interior PDF: every page at full-bleed size (trim + 0.125" each side) — the format KDP, IngramSpark and Lulu ask for. */
export async function exportInteriorPdf(book: Book, opts: ExportOptions) {
  const d = pageDims(book.trim);
  const pdf = new jsPDF({ unit: "in", format: [d.fullW, d.fullH], orientation: d.fullW > d.fullH ? "landscape" : "portrait" });
  for (let i = 0; i < book.pages.length; i++) {
    if (i > 0) pdf.addPage([d.fullW, d.fullH], d.fullW > d.fullH ? "landscape" : "portrait");
    const url = await renderPage(book, book.pages[i], opts.dpi, opts.watermark);
    pdf.addImage(url, "JPEG", 0, 0, d.fullW, d.fullH);
    opts.onProgress?.(i + 1, book.pages.length);
  }
  pdf.setProperties({ title: book.title, author: book.author, creator: "Bookling" });
  pdf.save(`${slug(book.title)}-interior.pdf`);
}

// KDP premium-color spine: page count × 0.002347 in (check KDP's calculator before upload).
export function spineWidthIn(pageCount: number) {
  return Math.max(0.06, pageCount * 0.002347);
}

/** Paperback cover wrap: back | spine | front, with bleed — built from the first page. */
export async function exportCoverPdf(book: Book, blurb: string) {
  const d = pageDims(book.trim);
  const dpi = 300;
  const front = await loadImage(await renderPage(book, book.pages[0], dpi, false));
  const spine = spineWidthIn(Math.max(24, book.pages.length));
  const W = d.trim.w * 2 + spine + 0.25;
  const H = d.trim.h + 0.25;
  const c = document.createElement("canvas");
  c.width = Math.round(W * dpi);
  c.height = Math.round(H * dpi);
  const g = c.getContext("2d")!;
  const bg = book.pages[0].bgColor || "#FFFDF7";
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  // back cover: soft wash + blurb
  g.fillStyle = "#F9D56E";
  g.globalAlpha = 0.35;
  g.fillRect(0, 0, (d.trim.w + 0.125) * dpi, c.height);
  g.globalAlpha = 1;
  g.fillStyle = "#2A363B";
  g.font = `${0.22 * dpi}px Fredoka, sans-serif`;
  wrapText(g, blurb || `${book.title}${book.author ? " by " + book.author : ""}`, 0.75 * dpi, 1.2 * dpi, (d.trim.w - 1.25) * dpi, 0.32 * dpi);
  // barcode-safe area (KDP places it bottom right of back cover)
  g.fillStyle = "#ffffff";
  g.fillRect((d.trim.w + 0.125 - 0.25 - 2) * dpi, (H - 0.25 - 0.125 - 1.2) * dpi, 2 * dpi, 1.2 * dpi);
  // spine
  const spineX = (d.trim.w + 0.125) * dpi;
  g.fillStyle = "#E84A5F";
  g.fillRect(spineX, 0, spine * dpi, c.height);
  if (book.pages.length >= 79) {
    g.save();
    g.translate(spineX + (spine * dpi) / 2, c.height / 2);
    g.rotate(Math.PI / 2);
    g.fillStyle = "#fff";
    g.font = `${Math.min(spine * 0.6, 0.3) * dpi}px Fredoka, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(book.title, 0, 0);
    g.restore();
  }
  // front cover (page 1 already includes bleed)
  g.drawImage(front, spineX + spine * dpi - 0.125 * dpi, 0, d.fullW * dpi, d.fullH * dpi);
  const pdf = new jsPDF({ unit: "in", format: [W, H], orientation: "landscape" });
  pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H);
  pdf.save(`${slug(book.title)}-cover.pdf`);
}

export async function exportPagePng(book: Book, page: Page, watermark: boolean) {
  const url = await renderPage(book, page, 150, watermark);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(book.title)}-page.jpg`;
  a.click();
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
