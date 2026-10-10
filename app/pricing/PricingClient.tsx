"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/plans";

export default function PricingClient() {
  const [yearly, setYearly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const choose = async (planId: string) => {
    if (!isSignedIn) return router.push("/sign-up?redirect_url=/pricing");
    if (planId === "free") return router.push("/dashboard");
    setBusy(planId);
    setErr("");
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, interval: yearly ? "year" : "month" }) }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    setBusy(null);
    if (j?.url) window.location.href = j.url;
    else if (r?.status === 403) router.push("/welcome?next=/pricing");
    else setErr(j?.error ?? "Checkout isn't available right now. Please try again.");
  };

  return (
    <>
      <div className="billing-toggle">
        <div className="seg" style={{ width: 280 }}>
          <button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
          <button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly · save ~35%</button>
        </div>
      </div>
      {err && <p className="err" role="alert" style={{ textAlign: "center", marginBottom: 12 }}>{err}</p>}
      <div className="plans">
        {PLANS.map((p) => (
          <div key={p.id} className={"plan" + (p.highlight ? " hl" : "")}>
            {p.highlight && <span className="badge">Most loved</span>}
            <h3>{p.name}</h3>
            <p className="hint">{p.tagline}</p>
            <div className="price">
              {p.monthly === 0 ? "Free" : yearly ? `$${p.yearly}` : `$${p.monthly}`}
              {p.monthly > 0 && <small>{yearly ? " /year" : " /month"}</small>}
            </div>
            <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <button className={"btn " + (p.highlight ? "primary" : "ghost")} disabled={busy === p.id} onClick={() => choose(p.id)}>
              {busy === p.id ? "Opening checkout…" : p.monthly === 0 ? "Start free" : `Choose ${p.name}`}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
