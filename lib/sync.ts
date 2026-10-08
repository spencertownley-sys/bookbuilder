"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import type { Book } from "./book";

export type SaveStatus = "loading" | "saved" | "saving" | "unsaved" | "offline" | "conflict" | "error";

const DEBOUNCE_MS = 1200;

/** Loads a book from the server into the editor and autosaves every change. */
export function useCloudBook(bookId: string) {
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [keepsakeUnlocked, setKeepsake] = useState(false);
  const version = useRef(0);
  const lastSaved = useRef<Book | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const dirty = useRef(false);

  const save = useCallback(async () => {
    const book = useStore.getState().books[bookId];
    if (!book || book === lastSaved.current) return;
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
      if (r.status === 409) {
        setStatus("conflict");
        return;
      }
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

  const load = useCallback(async () => {
    setStatus("loading");
    const r = await fetch(`/api/books/${bookId}`);
    if (!r.ok) {
      setError(r.status === 404 ? "We couldn't find that book." : "Couldn't open this book.");
      setStatus("error");
      return false;
    }
    const j = (await r.json()) as { book: Book; version: number; keepsakeUnlocked: boolean };
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
      if (useStore.getState().books[bookId] !== lastSaved.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unsub();
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bookId, load, save]);

  return { status, error, keepsakeUnlocked, setKeepsake, reload: load, saveNow: save };
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
