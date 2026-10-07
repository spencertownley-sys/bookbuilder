// Starter art generated with Higgsfield (gpt_image_2_5), Oct 2026.
// Files live in /public/templates. Add more by dropping files in and listing them here.

export interface TemplateAsset {
  id: string;
  name: string;
  src: string;
}

const bg = (id: string, name: string): TemplateAsset => ({ id, name, src: `/templates/backgrounds/${id}.jpg` });
const el = (id: string, name: string): TemplateAsset => ({ id, name, src: `/templates/elements/${id}.png` });

export const BACKGROUNDS: TemplateAsset[] = [
  bg("meadow", "Sunny meadow"),
  bg("bedroom", "Bedtime"),
  bg("forest", "Enchanted forest"),
  bg("beach", "Beach day"),
  bg("space", "Outer space"),
  bg("ocean", "Under the sea"),
  bg("town", "Main street"),
  bg("winter", "Snowy hill"),
  bg("classroom", "Classroom"),
  bg("garden", "Backyard garden"),
  bg("castle", "Castle at sunset"),
  bg("rainy-park", "Rainy park"),
];

export const STICKERS: TemplateAsset[] = [
  el("sun", "Smiling sun"),
  el("tree", "Tree"),
  el("balloons", "Balloons"),
  el("cottage", "Cottage"),
  el("cloud-rainbow", "Rainbow cloud"),
  el("treasure", "Treasure chest"),
  el("sailboat", "Sailboat"),
  el("books", "Books & apple"),
];

// Optional asset base (lets the standalone demo point at a different host).
export function assetUrl(src: string): string {
  const base = (globalThis as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? "";
  return base ? base + src.replace(/^\//, "") : src;
}
