"use client";
import dynamic from "next/dynamic";
import type { Services } from "@/components/editor/Panels";
import type { Plan } from "@/lib/plans";
import { useCloudBook } from "@/lib/sync";
import { uploadImage } from "@/lib/api";

const Editor = dynamic(() => import("@/components/editor/Editor"), { ssr: false, loading: () => <div className="loading">Opening your book…</div> });

const services: Services = {
  async generateImage(prompt, kind) {
    const r = await fetch("/api/ai-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, kind }) });
    const j = await r.json();
    return r.ok ? { url: j.url } : { error: j.error ?? "Something went wrong" };
  },
  uploadImage,
};

export default function EditorClient({ bookId, plan }: { bookId: string; plan: Plan }) {
  const cloud = useCloudBook(bookId);
  if (cloud.status === "loading") return <div className="loading">Opening your book…</div>;
  if (cloud.status === "error" && cloud.error?.includes("find"))
    return (
      <div className="loading" style={{ flexDirection: "column", gap: 12 }}>
        {cloud.error}
        <a className="btn primary" href="/dashboard">Back to my books</a>
      </div>
    );
  return <Editor plan={plan} services={services} cloud={{ bookId, ...cloud }} />;
}
