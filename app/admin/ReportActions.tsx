"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/api";

export default function ReportActions({ id, hasBook }: { id: number; hasBook: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const act = async (action: "resolve" | "disable-links") => {
    setBusy(true);
    setErr("");
    try {
      await postJson(`/api/admin/reports/${id}`, { action });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="form-actions">
      {hasBook && <button className="btn danger small" disabled={busy} onClick={() => act("disable-links")}>Turn off share links</button>}
      <button className="btn ghost small" disabled={busy} onClick={() => act("resolve")}>Mark reviewed</button>
      {err && <span className="err">{err}</span>}
    </div>
  );
}
