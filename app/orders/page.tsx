import SiteNav from "@/components/SiteNav";
import { fakePayments } from "@/lib/fulfill";
import OrdersClient from "./OrdersClient";

export const metadata = { title: "Orders — Book Builder" };

export default function Orders() {
  return (
    <>
      <SiteNav />
      <section className="section" style={{ paddingTop: 8 }}>
        <OrdersClient devTools={fakePayments()} />
      </section>
    </>
  );
}
