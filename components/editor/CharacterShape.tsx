"use client";
// A vector "paper doll" rig: every limb is a group rotated around its joint,
// so changing one number in `pose` swings the whole arm/leg naturally.
import { Group, Rect, Circle, Ellipse, Path, Line } from "react-konva";
import type { CharacterEl } from "@/lib/book";

const INK = "#2A363B";
const CREAM = "#F7E3C6";

interface LimbProps {
  x: number;
  y: number;
  angle: number;
  len: number;
  w: number;
  color: string;
  children?: React.ReactNode;
}

function Limb({ x, y, angle, len, w, color, children }: LimbProps) {
  return (
    <Group x={x} y={y} rotation={angle}>
      <Rect x={-w / 2} y={-w / 4} width={w} height={len + w / 2} cornerRadius={w / 2} fill={color} stroke={INK} strokeWidth={3} />
      <Group y={len}>{children}</Group>
    </Group>
  );
}

function Face({ el }: { el: CharacterEl }) {
  const e = el.expression;
  const robot = el.rig === "robot";
  const eyes =
    robot ? (
      <>
        <Rect x={-30} y={-66} width={20} height={14} cornerRadius={4} fill="#9BF6FF" stroke={INK} strokeWidth={3} />
        <Rect x={10} y={-66} width={20} height={14} cornerRadius={4} fill="#9BF6FF" stroke={INK} strokeWidth={3} />
      </>
    ) : e === "sleepy" ? (
      <>
        <Path data="M -24 -56 Q -17 -50 -10 -56" stroke={INK} strokeWidth={4} lineCap="round" />
        <Path data="M 10 -56 Q 17 -50 24 -56" stroke={INK} strokeWidth={4} lineCap="round" />
      </>
    ) : e === "laughing" ? (
      <>
        <Path data="M -24 -54 Q -17 -64 -10 -54" stroke={INK} strokeWidth={4} lineCap="round" />
        <Path data="M 10 -54 Q 17 -64 24 -54" stroke={INK} strokeWidth={4} lineCap="round" />
      </>
    ) : (
      <>
        <Circle x={-17} y={-56} radius={e === "surprised" ? 9 : 6.5} fill={INK} />
        <Circle x={17} y={-56} radius={e === "surprised" ? 9 : 6.5} fill={INK} />
        <Circle x={-15} y={-58} radius={2.2} fill="#fff" />
        <Circle x={19} y={-58} radius={2.2} fill="#fff" />
      </>
    );
  const mouth =
    e === "happy" ? <Path data="M -13 -31 Q 0 -18 13 -31" stroke={INK} strokeWidth={4} lineCap="round" /> :
    e === "sad" ? <Path data="M -11 -22 Q 0 -33 11 -22" stroke={INK} strokeWidth={4} lineCap="round" /> :
    e === "surprised" ? <Ellipse x={0} y={-26} radiusX={7} radiusY={9} fill={INK} /> :
    e === "laughing" ? <Path data="M -15 -33 Q 0 -6 15 -33 Z" fill="#B23A48" stroke={INK} strokeWidth={3} /> :
    <Line points={[-8, -28, 8, -28]} stroke={INK} strokeWidth={4} lineCap="round" />;
  return (
    <>
      {eyes}
      {!robot && <Circle x={-30} y={-38} radius={8} fill="#FF8FA3" opacity={0.45} />}
      {!robot && <Circle x={30} y={-38} radius={8} fill="#FF8FA3" opacity={0.45} />}
      {mouth}
    </>
  );
}

function HairBack({ el }: { el: CharacterEl }) {
  if (el.rig !== "kid") return null;
  const c = el.colors.hair;
  if (el.hair === "long") return <Rect x={-58} y={-96} width={116} height={118} cornerRadius={40} fill={c} stroke={INK} strokeWidth={3} />;
  if (el.hair === "buns")
    return (
      <>
        <Circle x={-44} y={-92} radius={19} fill={c} stroke={INK} strokeWidth={3} />
        <Circle x={44} y={-92} radius={19} fill={c} stroke={INK} strokeWidth={3} />
      </>
    );
  return null;
}

function HairFront({ el }: { el: CharacterEl }) {
  if (el.rig !== "kid" || el.hair === "none") return null;
  const c = el.colors.hair;
  if (el.hair === "curly")
    return (
      <Group>
        {[-44, -26, -8, 10, 28, 44].map((x, i) => (
          <Circle key={i} x={x} y={-92 + Math.abs(x) * 0.35} radius={17} fill={c} stroke={INK} strokeWidth={3} />
        ))}
      </Group>
    );
  return (
    <Path
      data="M -53 -52 C -56 -116 56 -116 53 -52 C 44 -74 6 -84 -20 -76 C -34 -72 -46 -64 -53 -52 Z"
      fill={c}
      stroke={INK}
      strokeWidth={3}
    />
  );
}

function Head({ el }: { el: CharacterEl }) {
  const fur = el.colors.skin;
  switch (el.rig) {
    case "robot":
      return (
        <>
          <Line points={[0, -100, 0, -124]} stroke={INK} strokeWidth={4} />
          <Circle x={0} y={-128} radius={9} fill={el.colors.hair} stroke={INK} strokeWidth={3} />
          <Rect x={-50} y={-100} width={100} height={92} cornerRadius={18} fill={fur} stroke={INK} strokeWidth={3} />
          <Rect x={-58} y={-64} width={10} height={24} cornerRadius={3} fill={el.colors.hair} stroke={INK} strokeWidth={3} />
          <Rect x={48} y={-64} width={10} height={24} cornerRadius={3} fill={el.colors.hair} stroke={INK} strokeWidth={3} />
          <Face el={el} />
        </>
      );
    case "bunny":
      return (
        <>
          {[-20, 20].map((x) => (
            <Group key={x} x={x} y={-118} rotation={x / 2}>
              <Ellipse radiusX={14} radiusY={44} fill={fur} stroke={INK} strokeWidth={3} />
              <Ellipse radiusX={6} radiusY={30} fill="#FFB5C2" />
            </Group>
          ))}
          <Circle y={-50} radius={52} fill={fur} stroke={INK} strokeWidth={3} />
          <Face el={el} />
          <Ellipse y={-38} radiusX={6} radiusY={4} fill="#FF8FA3" />
        </>
      );
    case "bear":
      return (
        <>
          {[-38, 38].map((x) => (
            <Group key={x} x={x} y={-92}>
              <Circle radius={18} fill={fur} stroke={INK} strokeWidth={3} />
              <Circle radius={9} fill={CREAM} />
            </Group>
          ))}
          <Circle y={-50} radius={52} fill={fur} stroke={INK} strokeWidth={3} />
          <Ellipse y={-32} radiusX={22} radiusY={16} fill={CREAM} />
          <Face el={el} />
          <Ellipse y={-40} radiusX={7} radiusY={5} fill={INK} />
        </>
      );
    case "cat":
      return (
        <>
          <Line points={[-48, -72, -40, -118, -12, -96]} closed fill={fur} stroke={INK} strokeWidth={3} />
          <Line points={[48, -72, 40, -118, 12, -96]} closed fill={fur} stroke={INK} strokeWidth={3} />
          <Circle y={-50} radius={52} fill={fur} stroke={INK} strokeWidth={3} />
          <Face el={el} />
          <Line points={[-5, -40, 5, -40, 0, -34]} closed fill="#FF8FA3" />
          {[-1, 1].map((s) => (
            <Group key={s}>
              <Line points={[s * 22, -36, s * 46, -40]} stroke={INK} strokeWidth={2} />
              <Line points={[s * 22, -32, s * 46, -30]} stroke={INK} strokeWidth={2} />
            </Group>
          ))}
        </>
      );
    default:
      return (
        <>
          <HairBack el={el} />
          <Circle x={-51} y={-48} radius={11} fill={fur} stroke={INK} strokeWidth={3} />
          <Circle x={51} y={-48} radius={11} fill={fur} stroke={INK} strokeWidth={3} />
          <Circle y={-50} radius={52} fill={fur} stroke={INK} strokeWidth={3} />
          <HairFront el={el} />
          <Face el={el} />
        </>
      );
  }
}

export function CharacterBody({ el }: { el: CharacterEl }) {
  const p = el.pose;
  const c = el.colors;
  const animal = el.rig !== "kid" && el.rig !== "robot";
  const shin = animal ? c.skin : c.pants;
  const arm = animal ? c.skin : c.shirt;
  const hand = <Circle radius={12} fill={c.skin} stroke={INK} strokeWidth={3} />;
  const shoe = <Ellipse x={6} y={8} radiusX={20} radiusY={11} fill={c.shoes} stroke={INK} strokeWidth={3} />;

  return (
    <>
      {/* legs (behind torso) */}
      <Limb x={-18} y={0} angle={p.lHip} len={58} w={26} color={c.pants}>
        <Limb x={0} y={0} angle={p.lKnee} len={56} w={24} color={shin}>
          {shoe}
        </Limb>
      </Limb>
      <Limb x={18} y={0} angle={p.rHip} len={58} w={26} color={c.pants}>
        <Limb x={0} y={0} angle={p.rKnee} len={56} w={24} color={shin}>
          {shoe}
        </Limb>
      </Limb>

      {/* upper body pivots at the hips */}
      <Group rotation={p.torso}>
        <Rect x={-40} y={-114} width={80} height={124} cornerRadius={el.rig === "robot" ? 14 : 34} fill={c.shirt} stroke={INK} strokeWidth={3} />
        <Rect x={-40} y={-18} width={80} height={28} cornerRadius={[0, 0, 30, 30]} fill={c.pants} stroke={INK} strokeWidth={3} />
        {animal && <Ellipse y={-60} radiusX={22} radiusY={30} fill={CREAM} opacity={0.0} />}

        <Limb x={-38} y={-98} angle={p.lShoulder} len={50} w={22} color={arm}>
          <Limb x={0} y={0} angle={p.lElbow} len={46} w={20} color={animal ? c.skin : c.skin}>
            {hand}
          </Limb>
        </Limb>
        <Limb x={38} y={-98} angle={p.rShoulder} len={50} w={22} color={arm}>
          <Limb x={0} y={0} angle={p.rElbow} len={46} w={20} color={c.skin}>
            {hand}
          </Limb>
        </Limb>

        <Group y={-108} rotation={p.neck}>
          <Head el={el} />
        </Group>
      </Group>
    </>
  );
}
