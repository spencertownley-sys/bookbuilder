"use client";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KImage, Text, Group, Transformer, Line, Label, Tag } from "react-konva";
import type Konva from "konva";
import type { Book, El, Hero, Page, TextEl, ImageEl, CharacterEl } from "@/lib/book";
import { applyHero, fillTokens, pageDims } from "@/lib/book";
import { coverCrop, useImage } from "@/lib/images";
import { CharacterBody } from "./CharacterShape";

export interface PageStageProps {
  book: Book;
  page: Page;
  scale: number; // screen pixels per logical unit
  interactive?: boolean;
  showGuides?: boolean;
  watermark?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<El>) => void;
  onEditText?: (el: TextEl) => void;
  editingId?: string | null;
}

function Background({ page, w, h }: { page: Page; w: number; h: number }) {
  const img = useImage(page.background);
  return (
    <>
      <Rect width={w} height={h} fill={page.bgColor || "#FFFDF7"} listening={false} />
      {img && <KImage image={img} width={w} height={h} crop={coverCrop(img, w, h)} listening={false} />}
    </>
  );
}

function ImageNode({ el, common, hero, editing }: { el: ImageEl; common: object; hero?: Hero; editing?: boolean }) {
  const emptySlot = el.slot === "heroPhoto" && !hero?.photo;
  const isPhoto = el.slot === "heroPhoto" && !!hero?.photo;
  const img = useImage(emptySlot && !editing ? undefined : isPhoto ? hero!.photo : el.src);
  if (emptySlot && !editing) return null; // the "add a photo" placeholder never prints or shows to readers
  return (
    <KImage
      {...common}
      image={img ?? undefined}
      width={el.width}
      height={el.height}
      crop={isPhoto && img ? coverCrop(img, el.width, el.height) : undefined}
      stroke={isPhoto ? "#FFFFFF" : undefined}
      strokeWidth={isPhoto ? 18 : 0}
      shadowColor={isPhoto ? "#000" : undefined}
      shadowOpacity={isPhoto ? 0.18 : 0}
      shadowBlur={isPhoto ? 16 : 0}
      shadowOffsetY={isPhoto ? 6 : 0}
      scaleX={el.flipX ? -1 : 1}
      offsetX={el.flipX ? el.width : 0}
    />
  );
}

function fontStyle(t: TextEl) {
  return `${t.italic ? "italic " : ""}${t.bold ? "bold" : "normal"}`;
}

function TextNode({ el, common, hidden, hero }: { el: TextEl; common: object; hidden: boolean; hero?: Hero }) {
  const textProps = {
    text: fillTokens(el.text, hero),
    width: el.width,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontStyle: fontStyle(el),
    fill: el.fill,
    align: el.align,
    lineHeight: el.lineHeight,
    stroke: el.outline,
    strokeWidth: el.outline ? Math.max(2, el.fontSize / 9) : 0,
    fillAfterStrokeEnabled: true,
    lineJoin: "round" as const,
    opacity: hidden ? 0 : 1,
  };
  if (el.bubble) {
    return (
      <Label {...common}>
        <Tag fill="#FFFFFF" stroke="#2A363B" strokeWidth={4} cornerRadius={28} pointerDirection="down" pointerWidth={36} pointerHeight={30} opacity={hidden ? 0 : 1} />
        <Text {...textProps} padding={24} />
      </Label>
    );
  }
  if (el.backdrop) {
    return (
      <Label {...common}>
        <Tag fill="#FFFDF7" cornerRadius={26} opacity={hidden ? 0 : 0.88} />
        <Text {...textProps} padding={22} />
      </Label>
    );
  }
  return <Text {...common} {...textProps} />;
}

const PageStage = forwardRef<Konva.Stage, PageStageProps>(function PageStage(
  { book, page, scale, interactive, showGuides, watermark, selectedId, onSelect, onChange, onEditText, editingId },
  ref,
) {
  const d = pageDims(book.trim);
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [snap, setSnap] = useState<{ v?: boolean; h?: boolean }>({});

  // Attach transformer to whatever is selected.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? layerRef.current?.findOne("#" + selectedId) : null;
    tr.nodes(node ? [node] : []);
    const sel = page.elements.find((e) => e.id === selectedId);
    tr.keepRatio(sel?.type !== "text");
    tr.enabledAnchors(
      sel?.type === "text"
        ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
        : ["top-left", "top-right", "bottom-left", "bottom-right"],
    );
    tr.getLayer()?.batchDraw();
  }, [selectedId, page]);

  // Redraw once web fonts finish loading so text measures correctly.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    const redraw = () => layerRef.current?.getStage()?.batchDraw();
    document.fonts.ready.then(redraw);
    document.fonts.addEventListener?.("loadingdone", redraw);
    return () => document.fonts.removeEventListener?.("loadingdone", redraw);
  }, []);

  const handleTransformEnd = (el: El, node: Konva.Node) => {
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const base = { x: node.x(), y: node.y(), rotation: node.rotation() };
    if (el.type === "character") {
      onChange?.(el.id, { ...base, scale: Math.max(0.15, (el as CharacterEl).scale * sy) });
      return;
    }
    node.scaleX(el.type === "image" && (el as ImageEl).flipX ? -1 : 1);
    node.scaleY(1);
    if (el.type === "image") {
      onChange?.(el.id, { ...base, width: Math.max(20, el.width * sx), height: Math.max(20, el.height * sy) });
    } else {
      const anchor = trRef.current?.getActiveAnchor() ?? "";
      const sideOnly = anchor === "middle-left" || anchor === "middle-right";
      onChange?.(el.id, {
        ...base,
        width: Math.max(60, el.width * sx),
        fontSize: sideOnly ? el.fontSize : Math.max(8, Math.round(el.fontSize * sy)),
      });
    }
  };

  // Gentle snap-to-center while dragging (Canva-style pink guide lines).
  const handleDragMove = (node: Konva.Node) => {
    const box = node.getClientRect({ relativeTo: layerRef.current! });
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const T = 10;
    const next: { v?: boolean; h?: boolean } = {};
    if (Math.abs(cx - d.width / 2) < T) {
      node.x(node.x() + (d.width / 2 - cx));
      next.v = true;
    }
    if (Math.abs(cy - d.height / 2) < T) {
      node.y(node.y() + (d.height / 2 - cy));
      next.h = true;
    }
    if (next.v !== snap.v || next.h !== snap.h) setSnap(next);
  };

  return (
    <Stage
      ref={ref}
      width={d.width * scale}
      height={d.height * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        if (interactive && e.target === e.target.getStage()) onSelect?.(null);
      }}
      onTouchStart={(e) => {
        if (interactive && e.target === e.target.getStage()) onSelect?.(null);
      }}
    >
      <Layer listening={false}>
        <Background page={page} w={d.width} h={d.height} />
      </Layer>
      <Layer ref={layerRef}>
        {/* clicking the background deselects */}
        <Rect width={d.width} height={d.height} fill="transparent" onMouseDown={() => onSelect?.(null)} onTap={() => onSelect?.(null)} />
        {page.elements.map((el) => {
          const common = {
            id: el.id,
            x: el.x,
            y: el.y,
            rotation: el.rotation,
            draggable: interactive && !el.locked,
            onMouseDown: () => interactive && onSelect?.(el.id),
            onTap: () => interactive && onSelect?.(el.id),
            onDragStart: () => interactive && onSelect?.(el.id),
            onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => handleDragMove(e.target),
            onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
              setSnap({});
              onChange?.(el.id, { x: e.target.x(), y: e.target.y() });
            },
            onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(el, e.target),
            onDblClick: () => el.type === "text" && onEditText?.(el),
            onDblTap: () => el.type === "text" && onEditText?.(el),
          };
          if (el.type === "image") return <ImageNode key={el.id} el={el} common={common} hero={book.hero} editing={interactive} />;
          if (el.type === "text") return <TextNode key={el.id} el={el} common={common} hidden={editingId === el.id} hero={book.hero} />;
          return (
            <Group key={el.id} {...common} scaleX={el.flipX ? -el.scale : el.scale} scaleY={el.scale}>
              <CharacterBody el={applyHero(el, book.hero)} />
            </Group>
          );
        })}
        {interactive && (
          <Transformer
            ref={trRef}
            rotateAnchorOffset={36}
            anchorSize={18}
            anchorCornerRadius={9}
            anchorStroke="#7C4DFF"
            anchorFill="#fff"
            borderStroke="#7C4DFF"
            borderStrokeWidth={2}
            flipEnabled={false}
            ignoreStroke
            padding={4}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 15 || newBox.height < 15 ? oldBox : newBox)}
          />
        )}
      </Layer>
      {(showGuides || snap.v || snap.h || watermark) && (
        <Layer listening={false}>
          {showGuides && (
            <>
              <Rect x={d.bleed} y={d.bleed} width={d.width - d.bleed * 2} height={d.height - d.bleed * 2} stroke="#E84A5F" strokeWidth={1.5 / scale} dash={[8 / scale, 6 / scale]} />
              <Rect x={d.safe} y={d.safe} width={d.width - d.safe * 2} height={d.height - d.safe * 2} stroke="#3EC1D3" strokeWidth={1.2 / scale} dash={[4 / scale, 6 / scale]} opacity={0.8} />
            </>
          )}
          {snap.v && <Line points={[d.width / 2, 0, d.width / 2, d.height]} stroke="#FF4FA3" strokeWidth={2 / scale} />}
          {snap.h && <Line points={[0, d.height / 2, d.width, d.height / 2]} stroke="#FF4FA3" strokeWidth={2 / scale} />}
          {watermark && (
            <Text
              text="Made with Book Builder · free plan"
              x={0}
              y={d.height - d.safe - 10}
              width={d.width}
              align="center"
              fontSize={20}
              fontFamily="Fredoka"
              fill="#ffffff"
              stroke="#00000055"
              strokeWidth={3}
              fillAfterStrokeEnabled
              opacity={0.85}
            />
          )}
        </Layer>
      )}
    </Stage>
  );
});

export default PageStage;
