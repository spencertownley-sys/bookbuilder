"use client";
import { useEffect, useState } from "react";
import { assetUrl } from "./templates";

const cache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const url = src.startsWith("data:") || /^https?:/.test(src) ? src : assetUrl(src);
  let p = cache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new window.Image();
      if (!url.startsWith("data:")) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
}

export function useImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    setImg(null);
    if (src) loadImage(src).then((i) => alive && setImg(i)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [src]);
  return img;
}

// Crop math so a background always fills the page like CSS `object-fit: cover`.
export function coverCrop(img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const r = w / h;
  if (ir > r) {
    const cw = img.height * r;
    return { x: (img.width - cw) / 2, y: 0, width: cw, height: img.height };
  }
  const ch = img.width / r;
  return { x: 0, y: (img.height - ch) / 2, width: img.width, height: ch };
}
