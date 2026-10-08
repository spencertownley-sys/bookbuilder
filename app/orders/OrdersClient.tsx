"use client";
import { useEffect, useState } from "react";
import { FORMATS, PrintFormat, money } from "@/lib/printing";
import { postJson } from "@/lib/api";

interface Order {
  id: string;
  book_id: string;
  book_title: string;
  format: PrintFormat;
  quantity: number;
  price_cents: number;
  shipping_cents: number;
  status: string;
  tracking_url: string | null;
  error: string | null;
  created_at: string;
  ship_name: string;
}

const STEPS = ["paid", "submitted", "in_production", "shipped", "delivered"];
const LABEL: Record<string, string> = {
  awaiting_payment: "Waiting for payment",
  paid: "Paid",
  submitted: "Sent to the printer",
  in_production: "Printing",
  shipped: "Shipped",
  delivered: "Delivered",
  canceled: "Canceled",
  error: "Needs attention",
};

export default function OrdersClient({ devTools }: { devTools: boolean }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const load = async () => {
    const r = await fetch("/api/orders");
    if (r.ok) setOrders((await r.json()).orders);
  };
  useEffect(() => {
    setPlaced(new URLSearchParams(location.search).get("placed"));
    load();
  }, []);
  const sim = async (id: string, status: string) => {
    await postJson("/api/dev/simulate-print", { orderId: id, status });
    load();
  };

  return (
    <>
      <div className="shelf-head">
        <h2>Orders</h2>
        <span style={{ flex: 1 }} />
        <a className="btn ghost" href="/dashboard">My books</a>
      </div>
      {placed && <p className="notice">Thank you! Your order is placed. We&apos;ll email you when it ships.</p>}
      {!orders && <p className="hint">Loading orders…</p>}
      {orders?.length === 0 && <p className="hint">No printed copies yet. Open a book and choose Print &amp; publish to order one.</p>}
      <div className="orders">
        {orders?.map((o) => {
          const step = STEPS.indexOf(o.status);
          return (
            <article key={o.id} className={"order" + (o.id === placed ? " fresh" : "")}>
              <div className="order-top">
                <div>
                  <strong>{o.book_title}</strong>
                  <p className="hint">
                    {o.quantity} × {FORMATS[o.format].label} · to {o.ship_name} · {new Date(o.created_at).toLocaleDateString()} · {money(o.price_cents + o.shipping_cents)}
                  </p>
                </div>
                <span className={"status-pill " + o.status}>{LABEL[o.status] ?? o.status}</span>
              </div>
              {step >= 0 && (
                <ol className="steps" aria-label="Order progress">
                  {STEPS.map((s, i) => (
                    <li key={s} className={i <= step ? "done" : ""}>{LABEL[s]}</li>
                  ))}
                </ol>
              )}
              {o.tracking_url && <a className="btn ghost small" href={o.tracking_url} target="_blank" rel="noreferrer">Track package</a>}
              {o.error && <p className="notice">{o.error}</p>}
              {devTools && (
                <div className="dev-tools">
                  <span className="fineprint">Dev only, simulate the printer:</span>
                  {["IN_PRODUCTION", "SHIPPED", "DELIVERED"].map((s) => (
                    <button key={s} className="btn ghost small" onClick={() => sim(o.id, s)}>{s.toLowerCase().replace("_", " ")}</button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
