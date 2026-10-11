"use client";
import { useState } from "react";
import { postJson } from "@/lib/api";

export default function WelcomeClient({ next, firstName }: { next: string; firstName: string }) {
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adult || !terms) return setErr("Tick both boxes to continue.");
    setBusy(true);
    setErr("");
    try {
      await postJson("/api/account/welcome", { adult, terms });
      window.location.assign(next);
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="welcome card" onSubmit={submit}>
      <span className="welcome-emoji" aria-hidden>📚</span>
      <h1>Welcome{firstName ? `, ${firstName}` : ""}!</h1>
      <p className="lead-sm">
        Accounts are for grown-ups. Kids are very welcome to make books <em>with</em> you, sitting right alongside.
      </p>
      <label className="check">
        <input id="welcome-adult" type="checkbox" checked={adult} onChange={(e) => (setAdult(e.target.checked), setErr(""))} />
        <span>I&apos;m 18 or older.</span>
      </label>
      <label className="check">
        <input id="welcome-terms" type="checkbox" checked={terms} onChange={(e) => (setTerms(e.target.checked), setErr(""))} />
        <span>
          I agree to the <a href="/terms" target="_blank">Terms of Service</a>, <a href="/privacy" target="_blank">Privacy Policy</a> and{" "}
          <a href="/content-policy" target="_blank">Content Policy</a>.
        </span>
      </label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn primary big" type="submit" disabled={busy}>{busy ? "One moment…" : "Start making books"}</button>
      <p className="fineprint">Your child&apos;s name and photo stay private, are never used to train AI, and are deleted when you delete the book or your account.</p>
    </form>
  );
}
