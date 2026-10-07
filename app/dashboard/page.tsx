import { auth } from "@clerk/nextjs/server";
import SiteNav from "@/components/SiteNav";
import { getCurrentPlan } from "@/lib/plan-server";
import ShelfClient from "./ShelfClient";

export const metadata = { title: "My books — Bookling" };

export default async function Dashboard() {
  const { userId } = await auth();
  const plan = await getCurrentPlan();
  return (
    <>
      <SiteNav />
      <section className="section" style={{ paddingTop: 10 }}>
        <ShelfClient userId={userId!} plan={plan} />
      </section>
    </>
  );
}
