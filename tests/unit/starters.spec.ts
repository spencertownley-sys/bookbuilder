import { expect, test } from "@playwright/test";
import { STARTERS, buildFromStarter } from "@/lib/starters";
import { DEFAULT_HERO, fillTokens, pageDims, TextEl } from "@/lib/book";

const hero = { ...DEFAULT_HERO, name: "Maya", pronoun: "she" as const };

test("there are the six launch starters", () => {
  expect(STARTERS.map((s) => s.id)).toEqual(["birthday", "first-day", "new-baby", "bedtime", "grandparents", "holiday"]);
});

for (const s of STARTERS) {
  test(`starter "${s.id}" builds a finished, personalized 24-page book`, () => {
    const book = buildFromStarter(s.id, hero);
    expect(book.pages).toHaveLength(24); // cover + dedication + 22 story pages
    expect(book.starter).toBe(s.id);
    expect(book.hero?.name).toBe("Maya");
    const d = pageDims(book.trim);
    for (const [i, page] of book.pages.entries()) {
      const texts = page.elements.filter((e): e is TextEl => e.type === "text");
      expect(texts.length, `page ${i} has text`).toBeGreaterThan(0);
      for (const t of texts) {
        const filled = fillTokens(t.text, book.hero);
        expect(filled, `page ${i} has no leftover tokens`).not.toMatch(/\{[A-Za-z']+\}/);
        expect(t.x, `page ${i} text starts inside the page`).toBeGreaterThanOrEqual(0);
        expect(t.x + t.width, `page ${i} text ends inside the page`).toBeLessThanOrEqual(d.width);
      }
    }
    // Every story page stars the hero.
    expect(book.pages.slice(2).every((p) => p.elements.some((e) => e.type === "character" && e.isHero))).toBe(true);
    // The dedication page has the photo slot.
    expect(book.pages[1].elements.some((e) => e.type === "image" && e.slot === "heroPhoto")).toBe(true);
  });
}

test("unknown starters are rejected", () => {
  expect(() => buildFromStarter("nope", hero)).toThrow();
});
