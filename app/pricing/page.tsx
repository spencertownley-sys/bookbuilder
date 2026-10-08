import SiteNav from "@/components/SiteNav";
import PricingClient from "./PricingClient";

export const metadata = { title: "Pricing — Book Builder" };

export default function Pricing() {
  return (
    <>
      <SiteNav />
      <section className="section">
        <h2>Simple plans, tiny prices</h2>
        <PricingClient />
        <p className="hint" style={{ textAlign: "center", marginTop: 24 }}>
          Just one gift book? Grab a one-time <b>Keepsake unlock</b> for $6 — print-ready and watermark-free, no subscription.
        </p>
      </section>
    </>
  );
}
