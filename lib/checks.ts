"use client";
import Konva from "konva";
import { Book, fillTokens, pageDims, TextEl } from "./book";
import { loadImage } from "./images";

export type IssueLevel = "block" | "warn" | "info";

export interface Issue {
  id: string;
  level: IssueLevel; // block = must fix; warn = fix or accept; info = reminder
  message: string;
  page?: number; // index into book.pages
}

const PRINT_DPI_MIN = 150;
const pageName = (i: number) => (i === 0 ? "Cover" : `Page ${i}`);

function textBox(t: TextEl, hero: Book["hero"]) {
  const pad = t.bubble ? 24 : t.backdrop ? 22 : 0;
  const k = new Konva.Text({
    text: fillTokens(t.text, hero),
    width: t.width,
    fontSize: t.fontSize,
    fontFamily: t.fontFamily,
    fontStyle: `${t.italic ? "italic " : ""}${t.bold ? "bold" : "normal"}`,
    lineHeight: t.lineHeight,
    padding: pad,
  });
  const box = { x: t.x, y: t.y, w: k.width(), h: k.height() + (t.bubble ? 30 : 0) };
  k.destroy();
  return box;
}

/** Everything that could go wrong at the printer, checked before export or ordering. */
export async function checkBook(book: Book, opts: { minPages?: number } = {}): Promise<Issue[]> {
  const issues: Issue[] = [];
  const d = pageDims(book.trim);
  const unitsPerIn = d.width / d.fullW;
  const needsName = book.pages.some((p) => p.elements.some((e) => e.type === "text" && /\{name\}/i.test(e.text)));
  if (needsName && !book.hero?.name?.trim())
    issues.push({ id: "hero-name", level: "block", message: "Your story uses {name}, but the hero doesn't have a name yet. Open Star your child to add one." });

  const minPages = opts.minPages ?? 24;
  if (book.pages.length < minPages)
    issues.push({ id: "pages", level: "warn", message: `This book has ${book.pages.length} pages. Printed picture books usually have at least ${minPages}; blank pages will be added at the end.` });

  for (let i = 0; i < book.pages.length; i++) {
    const p = book.pages[i];
    if (!p.background && p.elements.length === 0)
      issues.push({ id: `empty-${p.id}`, level: "warn", page: i, message: `${pageName(i)} is empty.` });
    for (const e of p.elements) {
      if (e.type === "text") {
        if (!e.text.trim()) {
          issues.push({ id: `blank-${e.id}`, level: "warn", page: i, message: `${pageName(i)} has an empty text box.` });
          continue;
        }
        const b = textBox(e, book.hero);
        const outside = b.x < d.safe - 1 || b.y < d.safe - 1 || b.x + b.w > d.width - d.safe + 1 || b.y + b.h > d.height - d.safe + 1;
        if (outside)
          issues.push({ id: `safe-${e.id}`, level: "warn", page: i, message: `${pageName(i)}: some text is outside the safe area and may be trimmed off.` });
      }
      if (e.type === "image" && e.slot === "heroPhoto" && !book.hero?.photo) {
        issues.push({ id: `photo-${e.id}`, level: "info", page: i, message: `${pageName(i)}: no photo added, so the photo frame will be left out. Add one in Star your child.` });
        continue;
      }
      const src = e.type === "image" ? (e.slot === "heroPhoto" && book.hero?.photo ? book.hero.photo : e.src) : "";
      if (e.type === "image" && !src.startsWith("/templates/")) {
        try {
          const img = await loadImage(src);
          const dpi = img.width / (e.width / unitsPerIn);
          if (dpi < PRINT_DPI_MIN)
            issues.push({ id: `dpi-${e.id}`, level: "warn", page: i, message: `${pageName(i)}: an image is only ${Math.round(dpi)} dpi at this size and may print blurry. Make it smaller or use a larger file.` });
        } catch {
          issues.push({ id: `missing-${e.id}`, level: "block", page: i, message: `${pageName(i)}: an image couldn't be loaded. Remove it or add it again.` });
        }
      }
    }
  }
  if (book.usesAI || book.pages.some((p) => p.elements.some((e) => e.type === "image" && e.aiGenerated)))
    issues.push({ id: "ai", level: "info", message: "This book contains AI-generated art. Amazon KDP and Apple Books require you to tick their AI-content disclosure box when you upload." });
  return issues;
}
