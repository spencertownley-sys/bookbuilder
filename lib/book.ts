import { nanoid } from "nanoid";

// ---------- Trim sizes ----------
// Logical canvas is always 1000 units wide and covers the full bleed area.
export const BLEED_IN = 0.125;

export interface TrimSize {
  id: string;
  label: string;
  w: number; // inches (trim)
  h: number;
}

export const TRIM_SIZES: TrimSize[] = [
  { id: "sq85", label: '8.5" × 8.5" square (most popular)', w: 8.5, h: 8.5 },
  { id: "land108", label: '10" × 8" landscape', w: 10, h: 8 },
  { id: "port811", label: '8.5" × 11" portrait', w: 8.5, h: 11 },
  { id: "sq8", label: '8" × 8" square', w: 8, h: 8 },
  { id: "port69", label: '6" × 9" early reader', w: 6, h: 9 },
];

export const LOGICAL_W = 1000;

export function pageDims(trimId: string) {
  const t = TRIM_SIZES.find((s) => s.id === trimId) ?? TRIM_SIZES[0];
  const fullW = t.w + BLEED_IN * 2;
  const fullH = t.h + BLEED_IN * 2;
  const unitsPerIn = LOGICAL_W / fullW;
  return {
    trim: t,
    fullW,
    fullH,
    width: LOGICAL_W,
    height: Math.round(fullH * unitsPerIn),
    bleed: BLEED_IN * unitsPerIn,
    // keep text 0.375" inside trim (KDP-safe margin)
    safe: (BLEED_IN + 0.375) * unitsPerIn,
  };
}

// ---------- Elements ----------
interface Base {
  id: string;
  x: number;
  y: number;
  rotation: number;
  locked?: boolean;
}

export interface ImageEl extends Base {
  type: "image";
  src: string;
  width: number;
  height: number;
  flipX?: boolean;
  aiGenerated?: boolean;
}

export interface TextEl extends Base {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  width: number;
  outline?: string; // stroke color for readability on busy art
  lineHeight: number;
  bubble?: boolean; // speech-bubble backdrop
}

export type Rig = "kid" | "bear" | "bunny" | "cat" | "robot";
export type Joint =
  | "torso"
  | "neck"
  | "lShoulder"
  | "lElbow"
  | "rShoulder"
  | "rElbow"
  | "lHip"
  | "lKnee"
  | "rHip"
  | "rKnee";
export type Pose = Record<Joint, number>;
export type Expression = "happy" | "surprised" | "sleepy" | "sad" | "laughing";
export type HairStyle = "short" | "long" | "curly" | "buns" | "none";

export interface CharacterEl extends Base {
  type: "character";
  rig: Rig;
  name: string; // e.g. the child's name — useful for personalization
  pose: Pose;
  expression: Expression;
  hair: HairStyle;
  scale: number;
  flipX: boolean;
  colors: { skin: string; hair: string; shirt: string; pants: string; shoes: string };
}

export type El = ImageEl | TextEl | CharacterEl;

export interface Page {
  id: string;
  background?: string;
  bgColor: string;
  elements: El[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  trim: string;
  mode: "keepsake" | "publish"; // one-of-a-kind gift vs. mass-market
  pages: Page[];
  updatedAt: number;
  usesAI: boolean; // drives the KDP/Apple disclosure reminder
}

// ---------- Poses ----------
const P = (p: Partial<Pose>): Pose => ({
  torso: 0, neck: 0, lShoulder: 12, lElbow: 0, rShoulder: -12, rElbow: 0,
  lHip: 4, lKnee: 0, rHip: -4, rKnee: 0, ...p,
});

// Angles in degrees; 0 = limb hanging straight down. Positive = rotate clockwise.
export const POSES: Record<string, { label: string; emoji: string; pose: Pose }> = {
  stand: { label: "Stand", emoji: "🧍", pose: P({}) },
  wave: { label: "Wave", emoji: "👋", pose: P({ rShoulder: -150, rElbow: -30, neck: -6 }) },
  cheer: { label: "Cheer", emoji: "🙌", pose: P({ lShoulder: 155, rShoulder: -155, lElbow: 10, rElbow: -10 }) },
  run: { label: "Run", emoji: "🏃", pose: P({ torso: 10, lShoulder: -50, lElbow: -70, rShoulder: 55, rElbow: -60, lHip: -45, lKnee: 60, rHip: 35, rKnee: 10 }) },
  jump: { label: "Jump", emoji: "🤸", pose: P({ lShoulder: 130, rShoulder: -130, lHip: 30, lKnee: -70, rHip: -30, rKnee: 70 }) },
  sit: { label: "Sit", emoji: "🪑", pose: P({ lHip: -85, lKnee: 85, rHip: -80, rKnee: 80, lShoulder: -20, rShoulder: 20, lElbow: -40, rElbow: 40 }) },
  point: { label: "Point", emoji: "👉", pose: P({ rShoulder: -95, rElbow: 0, neck: -8 }) },
  hug: { label: "Hug", emoji: "🤗", pose: P({ lShoulder: -70, lElbow: -80, rShoulder: 70, rElbow: 80 }) },
  dance: { label: "Dance", emoji: "💃", pose: P({ torso: -8, lShoulder: 140, lElbow: 40, rShoulder: -40, rElbow: -90, lHip: 25, lKnee: -50, rHip: -8 }) },
  think: { label: "Think", emoji: "🤔", pose: P({ neck: 10, rShoulder: -30, rElbow: -140, lShoulder: 25, lElbow: 60 }) },
  shy: { label: "Shy", emoji: "🙈", pose: P({ neck: 12, lShoulder: -40, lElbow: -120, rShoulder: 40, rElbow: 120, lHip: 10, rHip: 6 }) },
  kick: { label: "Kick", emoji: "⚽", pose: P({ torso: -6, rHip: -70, rKnee: 0, lHip: 10, lShoulder: 50, rShoulder: -50 }) },
};

export const JOINT_LABELS: Record<Joint, string> = {
  torso: "Lean",
  neck: "Head tilt",
  lShoulder: "Left arm",
  lElbow: "Left elbow",
  rShoulder: "Right arm",
  rElbow: "Right elbow",
  lHip: "Left leg",
  lKnee: "Left knee",
  rHip: "Right leg",
  rKnee: "Right knee",
};

export const SKIN_TONES = ["#FFDFC4", "#F0C8A0", "#D9A273", "#B97A50", "#8D5524", "#5C3A1E"];
export const PALETTE = ["#E84A5F", "#FF847C", "#FECEA8", "#F9D56E", "#99B898", "#3EC1D3", "#2A363B", "#6C5B7B", "#FFFFFF", "#222222"];

const RIG_DEFAULTS: Record<Rig, CharacterEl["colors"]> = {
  kid: { skin: "#F0C8A0", hair: "#5B3A1E", shirt: "#E84A5F", pants: "#3EC1D3", shoes: "#2A363B" },
  bear: { skin: "#A8754B", hair: "#A8754B", shirt: "#F9D56E", pants: "#6C5B7B", shoes: "#5C3A1E" },
  bunny: { skin: "#F4F1EC", hair: "#F4F1EC", shirt: "#99B898", pants: "#FF847C", shoes: "#E84A5F" },
  cat: { skin: "#F2A65A", hair: "#F2A65A", shirt: "#3EC1D3", pants: "#2A363B", shoes: "#FFFFFF" },
  robot: { skin: "#B8C4CC", hair: "#E84A5F", shirt: "#7FA1B3", pants: "#5E7482", shoes: "#2A363B" },
};

export const FREE_RIGS: Rig[] = ["kid", "bear", "bunny"];

// ---------- Factories ----------
export const newId = () => nanoid(10);

export function newPage(bg?: string): Page {
  return { id: newId(), background: bg, bgColor: "#FFFDF7", elements: [] };
}

export function newBook(title = "My Story", trim = "sq85", mode: Book["mode"] = "keepsake"): Book {
  const cover = newPage("/templates/backgrounds/meadow.jpg");
  const d = pageDims(trim);
  cover.elements.push(
    newText(title, { y: d.height * 0.12, fontSize: 92, fontFamily: "Chewy", fill: "#FFFFFF", outline: "#E84A5F" }, d.width),
    newCharacter("kid", d.width / 2, d.height * 0.72),
  );
  return {
    id: newId(),
    title,
    author: "",
    trim,
    mode,
    pages: [cover, newPage("/templates/backgrounds/bedroom.jpg"), newPage()],
    updatedAt: Date.now(),
    usesAI: false,
  };
}

export function newText(text: string, over: Partial<TextEl> = {}, pageW = LOGICAL_W): TextEl {
  const width = over.width ?? pageW * 0.8;
  return {
    id: newId(),
    type: "text",
    text,
    x: (pageW - width) / 2,
    y: 80,
    rotation: 0,
    fontFamily: "Fredoka",
    fontSize: 48,
    fill: "#2A363B",
    align: "center",
    bold: false,
    italic: false,
    width,
    lineHeight: 1.2,
    ...over,
  };
}

export function newCharacter(rig: Rig, x: number, y: number): CharacterEl {
  return {
    id: newId(),
    type: "character",
    rig,
    name: rig === "kid" ? "Hero" : rig[0].toUpperCase() + rig.slice(1),
    x,
    y,
    rotation: 0,
    pose: { ...POSES.wave.pose },
    expression: "happy",
    hair: rig === "kid" ? "short" : "none",
    scale: 1,
    flipX: false,
    colors: { ...RIG_DEFAULTS[rig] },
  };
}

export function newImage(src: string, pageW: number, pageH: number, natural?: { w: number; h: number }, ai = false): ImageEl {
  const maxW = pageW * 0.35;
  const ratio = natural ? natural.h / natural.w : 1;
  const width = maxW;
  const height = maxW * ratio;
  return {
    id: newId(),
    type: "image",
    src,
    x: (pageW - width) / 2,
    y: (pageH - height) / 2,
    width,
    height,
    rotation: 0,
    aiGenerated: ai,
  };
}
