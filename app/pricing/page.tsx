import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { FORMATS, money } from "@/lib/printing";
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
          Just one gift book? Grab a one-time <b>Keepsake unlock</b> for $6: print-ready and watermark-free, no subscription.
          <br />
          Printed copies on any plan: hardcover {money(FORMATS.hardcover.retailCents)}, paperback {money(FORMATS.paperback.retailCents)}, plus shipping.
          A printed order includes that book&apos;s Keepsake unlock.
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
