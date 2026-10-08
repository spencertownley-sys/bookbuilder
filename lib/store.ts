"use client";
import { create } from "zustand";
import { Book, El, Hero, Page, newBook, newId, newPage } from "./book";

// In-memory editor state. Books are loaded from and saved to the server by lib/sync.ts;
// the demo build creates books locally with createBook.

interface History {
  past: Book[];
  future: Book[];
}

interface State {
  books: Record<string, Book>;
  currentBookId: string | null;
  currentPageId: string | null;
  selectedId: string | null;
  history: Record<string, History>;

  createBook: (title?: string, trim?: string, mode?: Book["mode"]) => string;
  loadBook: (book: Book) => void;
  setHero: (hero: Hero) => void;
  deleteBook: (id: string) => void;
  openBook: (id: string) => void;
  updateBookMeta: (patch: Partial<Pick<Book, "title" | "author" | "trim" | "mode">>) => void;

  selectPage: (id: string) => void;
  addPage: (afterId?: string) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  movePage: (id: string, dir: -1 | 1) => void;
  setBackground: (src?: string, color?: string) => void;

  addElement: (el: El) => void;
  updateElement: (id: string, patch: Partial<El>, commit?: boolean) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  reorder: (id: string, where: "front" | "back" | "up" | "down") => void;
  select: (id: string | null) => void;

  markAI: () => void;
  undo: () => void;
  redo: () => void;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const useStore = create<State>()((set, get) => {
      // Record an undo snapshot, then apply a mutation to the current book.
      const mutate = (fn: (b: Book) => void, commit = true) => {
        const { currentBookId, books, history } = get();
        if (!currentBookId) return;
        const book = books[currentBookId];
        const next = clone(book);
        fn(next);
        next.updatedAt = Date.now();
        const h = history[currentBookId] ?? { past: [], future: [] };
        set({
          books: { ...books, [currentBookId]: next },
          history: commit
            ? { ...history, [currentBookId]: { past: [...h.past.slice(-49), book], future: [] } }
            : history,
        });
      };
      const page = (b: Book) => b.pages.find((p) => p.id === get().currentPageId) ?? b.pages[0];

      return {
        books: {},
        currentBookId: null,
        currentPageId: null,
        selectedId: null,
        history: {},

        loadBook: (book) => set((s) => ({ books: { ...s.books, [book.id]: book } })),
        setHero: (hero) =>
          mutate((b) => {
            b.hero = hero;
          }),
        createBook: (title, trim, mode) => {
          const b = newBook(title, trim, mode);
          set((s) => ({ books: { ...s.books, [b.id]: b } }));
          return b.id;
        },
        deleteBook: (id) =>
          set((s) => {
            const books = { ...s.books };
            delete books[id];
            return { books };
          }),
        openBook: (id) => {
          const b = get().books[id];
          set({ currentBookId: id, currentPageId: b?.pages[0]?.id ?? null, selectedId: null });
        },
        updateBookMeta: (patch) => mutate((b) => Object.assign(b, patch)),

        selectPage: (id) => set({ currentPageId: id, selectedId: null }),
        addPage: (afterId) => {
          const p = newPage();
          mutate((b) => {
            const i = afterId ? b.pages.findIndex((x) => x.id === afterId) : b.pages.length - 1;
            b.pages.splice(i + 1, 0, p);
          });
          set({ currentPageId: p.id, selectedId: null });
        },
        duplicatePage: (id) => {
          let newPid = "";
          mutate((b) => {
            const i = b.pages.findIndex((x) => x.id === id);
            const copy: Page = clone(b.pages[i]);
            copy.id = newPid = newId();
            copy.elements.forEach((e) => (e.id = newId()));
            b.pages.splice(i + 1, 0, copy);
          });
          set({ currentPageId: newPid });
        },
        deletePage: (id) => {
          const b = get().books[get().currentBookId!];
          if (!b || b.pages.length <= 1) return;
          const i = b.pages.findIndex((x) => x.id === id);
          mutate((bk) => {
            bk.pages = bk.pages.filter((x) => x.id !== id);
          });
          const remaining = get().books[get().currentBookId!].pages;
          set({ currentPageId: remaining[Math.max(0, i - 1)].id, selectedId: null });
        },
        movePage: (id, dir) =>
          mutate((b) => {
            const i = b.pages.findIndex((x) => x.id === id);
            const j = i + dir;
            if (j < 0 || j >= b.pages.length) return;
            [b.pages[i], b.pages[j]] = [b.pages[j], b.pages[i]];
          }),
        setBackground: (src, color) =>
          mutate((b) => {
            const p = page(b);
            p.background = src;
            if (color) p.bgColor = color;
          }),

        addElement: (el) => {
          mutate((b) => page(b).elements.push(el));
          set({ selectedId: el.id });
        },
        updateElement: (id, patch, commit = true) =>
          mutate((b) => {
            const p = page(b);
            const i = p.elements.findIndex((e) => e.id === id);
            if (i >= 0) p.elements[i] = { ...p.elements[i], ...patch } as El;
          }, commit),
        deleteElement: (id) => {
          mutate((b) => {
            const p = page(b);
            p.elements = p.elements.filter((e) => e.id !== id);
          });
          set({ selectedId: null });
        },
        duplicateElement: (id) => {
          const nid = newId();
          mutate((b) => {
            const p = page(b);
            const e = p.elements.find((x) => x.id === id);
            if (!e) return;
            const c = { ...clone(e), id: nid, x: e.x + 30, y: e.y + 30 };
            p.elements.push(c);
          });
          set({ selectedId: nid });
        },
        reorder: (id, where) =>
          mutate((b) => {
            const els = page(b).elements;
            const i = els.findIndex((e) => e.id === id);
            if (i < 0) return;
            const [e] = els.splice(i, 1);
            const to =
              where === "front" ? els.length : where === "back" ? 0 : where === "up" ? Math.min(els.length, i + 1) : Math.max(0, i - 1);
            els.splice(to, 0, e);
          }),
        select: (id) => set({ selectedId: id }),

        markAI: () => mutate((b) => (b.usesAI = true), false),

        undo: () => {
          const { currentBookId: id, history, books } = get();
          if (!id) return;
          const h = history[id];
          if (!h?.past.length) return;
          const prev = h.past[h.past.length - 1];
          set({
            books: { ...books, [id]: prev },
            history: { ...history, [id]: { past: h.past.slice(0, -1), future: [books[id], ...h.future] } },
            selectedId: null,
          });
          if (!prev.pages.some((p) => p.id === get().currentPageId)) set({ currentPageId: prev.pages[0].id });
        },
        redo: () => {
          const { currentBookId: id, history, books } = get();
          if (!id) return;
          const h = history[id];
          if (!h?.future.length) return;
          const [next, ...rest] = h.future;
          set({
            books: { ...books, [id]: next },
            history: { ...history, [id]: { past: [...h.past, books[id]], future: rest } },
            selectedId: null,
          });
          if (!next.pages.some((p) => p.id === get().currentPageId)) set({ currentPageId: next.pages[0].id });
        },
      };
    });

export function useCurrent() {
  const book = useStore((s) => (s.currentBookId ? s.books[s.currentBookId] : undefined));
  const pageId = useStore((s) => s.currentPageId);
  const page = book?.pages.find((p) => p.id === pageId) ?? book?.pages[0];
  return { book, page };
}
