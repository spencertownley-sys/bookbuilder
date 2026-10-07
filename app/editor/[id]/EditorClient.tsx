"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@/components/editor/Editor"), { ssr: false, loading: () => <div className="loading">Opening your book…</div> });
import type { Services } from "@/components/editor/Panels";
import { hydrateForUser, useStore } from "@/lib/store";
import type { Plan } from "@/lib/plans";

const services: Services = {
  async generateImage(prompt, kind) {
    const r = await fetch("/api/ai-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, kind }) });
    const j = await r.json();
    return r.ok ? { url: j.url } : { error: j.error ?? "Something went wrong" };
  },
};

export default function EditorClient({ bookId, userId, plan }: { bookId: string; userId: string; plan: Plan }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    Promise.resolve(hydrateForUser(userId)).then(() => {
      const s = useStore.getState();
      if (!s.books[bookId]) return router.replace("/dashboard");
      s.openBook(bookId);
      setReady(true);
    });
  }, [bookId, userId, router]);
  if (!ready) return <div className="loading">Opening your book…</div>;
  return <Editor plan={plan} services={services} />;
}
