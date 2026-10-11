import SiteNav from "@/components/SiteNav";
import { fakePayments } from "@/lib/fulfill";
import { requirePageUser } from "@/lib/page-auth";
import OrdersClient from "./OrdersClient";

export const metadata = { title: "Orders — Book Builder" };

export default async function Orders() {
  await requirePageUser("/orders");
  return (
    <>
      <SiteNav />
      <section className="section" style={{ paddingTop: 8 }}>
        <OrdersClient devTools={fakePayments()} />
      </section>
    </>
  );
}
