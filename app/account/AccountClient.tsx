"use client";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { postJson } from "@/lib/api";

export default function AccountClient({ email, planName, isFree, hasBilling, isAdmin }: { email: string; planName: string; isFree: boolean; hasBilling: boolean; isAdmin: boolean }) {
  const { signOut, openUserProfile } = useClerk();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const billing = async () => {
    setErr("");
    try {
      const j = await postJson<{ url: string }>("/api/billing-portal", {});
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const remove = async () => {
    setBusy(true);
    setErr("");
    try {
      await postJson("/api/account", { confirm }, "DELETE");
      try {
        localStorage.clear();
      } catch {}
      await signOut({ redirectUrl: "/?deleted=1" }).catch(() => window.location.assign("/?deleted=1"));
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="account">
      <h1>Your account</h1>
      <div className="card account-card">
        <div className="kv"><span>Signed in as</span><b>{email || "—"}</b></div>
        <div className="kv"><span>Plan</span><b>{planName}</b></div>
        <div className="form-actions start">
          <button className="btn ghost" onClick={() => openUserProfile()}>Email &amp; password</button>
          {isFree ? <a className="btn ghost" href="/pricing">Upgrade</a> : hasBilling && <button className="btn ghost" onClick={billing}>Manage billing</button>}
          <a className="btn ghost" href="/orders">Orders</a>
          {isAdmin && <a className="btn ghost" href="/admin">Launch metrics</a>}
        </div>
      </div>

      <div className="card account-card danger-zone">
        <h2>Delete my account</h2>
        <p className="hint">
          This cancels any subscription and permanently deletes every book, photo, upload, voice recording and share link. Records of past orders
          are kept for tax purposes. This can&apos;t be undone.
        </p>
        <label className="field">
          <span>Type DELETE to confirm</span>
          <input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </label>
        <button className="btn danger" disabled={confirm !== "DELETE" || busy} onClick={remove}>{busy ? "Deleting everything…" : "Delete my account"}</button>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}
