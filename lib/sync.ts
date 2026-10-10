"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import type { Book } from "./book";

export type SaveStatus = "loading" | "saved" | "saving" | "unsaved" | "offline" | "conflict" | "error";

const DEBOUNCE_MS = 1200;
const POLL_MS = 20_000;

/**
 * Loads a book from the server into the editor and autosaves every change. When two devices edit the
 * same book, the later save wins (PRD): each editor checks for newer versions (on focus and every
 * 20 s) and, when another device saved, pauses autosave and asks to reload (or keep its own copy).
 */
export function useCloudBook(bookId: string) {
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [keepsakeUnlocked, setKeepsake] = useState(false);
  const version = useRef(0);
  const lastSaved = useRef<Book | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const dirty = useRef(false);
  const conflict = useRef(false);

  const save = useCallback(async () => {
    const book = useStore.getState().books[bookId];
    if (!book || book === lastSaved.current || conflict.current) return;
    if (inFlight.current) {
      dirty.current = true;
      return;
    }
    inFlight.current = true;
    setStatus("saving");
    try {
      const r = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book, baseVersion: version.current }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Couldn't save.");
        setStatus("error");
        return;
      }
      version.current = j.version;
      lastSaved.current = book;
      setError(null);
      setStatus(useStore.getState().books[bookId] === book ? "saved" : "unsaved");
    } catch {
      setStatus("offline");
      timer.current = setTimeout(save, 5000); // retry when the connection comes back
    } finally {
      inFlight.current = false;
      if (dirty.current) {
        dirty.current = false;
        save();
      }
    }
  }, [bookId]);

  /** Asks the server whether another device saved a newer version. */
  const check = useCallback(async () => {
    if (conflict.current || inFlight.current || document.visibilityState === "hidden") return;
    const r = await fetch(`/api/books/${bookId}/version`).catch(() => null);
    if (!r?.ok || inFlight.current) return;
    const { version: v } = (await r.json()) as { version: number };
    if (v > version.current && !inFlight.current) {
      conflict.current = true;
      if (timer.current) clearTimeout(timer.current);
      setStatus("conflict");
    }
  }, [bookId]);

  /** Overrides the other device: this copy becomes the latest (the later save wins). */
  const keepMine = useCallback(async () => {
    const r = await fetch(`/api/books/${bookId}/version`).catch(() => null);
    if (r?.ok) version.current = ((await r.json()) as { version: number }).version;
    conflict.current = false;
    lastSaved.current = null;
    await save();
  }, [bookId, save]);

  const load = useCallback(async () => {
    setStatus("loading");
    const r = await fetch(`/api/books/${bookId}`).catch(() => null);
    if (!r?.ok) {
      setError(r?.status === 404 ? "We couldn't find that book." : "Couldn't open this book. Check your connection and reload.");
      setStatus("error");
      return false;
    }
    const j = (await r.json()) as { book: Book; version: number; keepsakeUnlocked: boolean };
    conflict.current = false;
    version.current = j.version;
    lastSaved.current = j.book;
    setKeepsake(j.keepsakeUnlocked);
    const s = useStore.getState();
    s.loadBook(j.book);
    s.openBook(bookId);
    useStore.setState((st) => ({ history: { ...st.history, [bookId]: { past: [], future: [] } } }));
    setStatus("saved");
    return true;
  }, [bookId]);

  useEffect(() => {
    load();
    const unsub = useStore.subscribe((s, prev) => {
      const b = s.books[bookId];
      if (!b || b === prev.books[bookId] || b === lastSaved.current) return;
      setStatus((st) => (st === "conflict" ? st : "unsaved"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, DEBOUNCE_MS);
    });
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (useStore.getState().books[bookId] !== lastSaved.current && !conflict.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const poll = setInterval(check, POLL_MS);
    return () => {
      unsub();
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bookId, load, save, check]);

  return { status, error, keepsakeUnlocked, setKeepsake, reload: load, saveNow: save, keepMine };
}

/** Moves books the old browser-only version saved into the account, once per browser. */
export async function importLocalBooks(userId: string) {
  const flag = `bb-imported-${userId}`;
  try {
    if (localStorage.getItem(flag)) return 0;
    const raw = localStorage.getItem(`bookling-books-${userId}`);
    if (!raw) {
      localStorage.setItem(flag, "1");
      return 0;
    }
    const books = Object.values((JSON.parse(raw)?.state?.books ?? {}) as Record<string, Book>);
    if (!books.length) {
      localStorage.setItem(flag, "1");
      return 0;
    }
    const r = await fetch("/api/books/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ books }) });
    if (!r.ok) return 0;
    localStorage.setItem(flag, "1");
    return ((await r.json()) as { imported: number }).imported;
  } catch {
    return 0;
  }
}
