import { expect, test } from "@playwright/test";
import { DEFAULT_HERO, Hero, applyHero, fillTokens, hasUnfilledTokens, isFinished, newCharacter, newPage, newText, pageDims } from "@/lib/book";

const maya: Hero = { ...DEFAULT_HERO, name: "Maya", pronoun: "she" };
const leo: Hero = { ...DEFAULT_HERO, name: "Leo", pronoun: "he" };

test.describe("fillTokens (Star your child)", () => {
  test("fills the name and pronouns", () => {
    expect(fillTokens("{name} hugged {their} bear and {they} smiled.", maya)).toBe("Maya hugged her bear and she smiled.");
    expect(fillTokens("{name} hugged {their} bear and {they} smiled.", leo)).toBe("Leo hugged his bear and he smiled.");
    expect(fillTokens("{name} said {they} {are} ready.", { ...maya, pronoun: "they" })).toBe("Maya said they are ready.");
  });

  test("capitalized tokens start sentences", () => {
    expect(fillTokens("{They} ran. {Their} shoes squeaked.", leo)).toBe("He ran. His shoes squeaked.");
    expect(fillTokens("{Name} waved.", maya)).toBe("Maya waved.");
  });

  test("object and reflexive forms", () => {
    expect(fillTokens("Everyone loves {them}. {name} did it {themself}.", maya)).toBe("Everyone loves her. Maya did it herself.");
    expect(fillTokens("{they're} here and {they} {were} late", leo)).toBe("he's here and he was late");
  });

  test("unknown tokens and plain text are left alone", () => {
    expect(fillTokens("{dragon} roared", maya)).toBe("{dragon} roared");
    expect(fillTokens("no tokens", maya)).toBe("no tokens");
    expect(fillTokens("{name}", undefined)).toBe("{name}");
  });

  test("a missing name stays visible so the print check can catch it", () => {
    expect(hasUnfilledTokens("Hi {name}!", { ...maya, name: "" })).toBe(true);
    expect(hasUnfilledTokens("Hi {name}!", maya)).toBe(false);
  });
});

test("applyHero gives hero characters the hero's look and leaves others alone", () => {
  const kid = { ...newCharacter("kid", 0, 0), isHero: true };
  const out = applyHero(kid, { ...leo, skin: "#8D5524", hair: "curly", hairColor: "#C0392B", favoriteColor: "#3EC1D3" });
  expect(out.name).toBe("Leo");
  expect(out.hair).toBe("curly");
  expect(out.colors).toMatchObject({ skin: "#8D5524", hair: "#C0392B", shirt: "#3EC1D3" });
  const bear = newCharacter("bear", 0, 0);
  expect(applyHero(bear, leo)).toBe(bear);
});

test("isFinished needs 12+ pages with text on every page", () => {
  const withText = () => {
    const p = newPage();
    p.elements.push(newText("Once upon a time"));
    return p;
  };
  expect(isFinished({ pages: Array.from({ length: 12 }, withText) })).toBe(true);
  expect(isFinished({ pages: Array.from({ length: 11 }, withText) })).toBe(false);
  const pages = Array.from({ length: 14 }, withText);
  pages[5] = newPage();
  expect(isFinished({ pages })).toBe(false);
  pages[5].elements.push(newText("   "));
  expect(isFinished({ pages })).toBe(false);
});

test("page dimensions include bleed and a KDP-safe margin", () => {
  const d = pageDims("sq85");
  expect(d.fullW).toBeCloseTo(8.75);
  expect(d.width).toBe(1000);
  expect(d.height).toBe(1000);
  expect(d.bleed).toBeCloseTo((0.125 / 8.75) * 1000);
  expect(d.safe).toBeCloseTo((0.5 / 8.75) * 1000);
});
