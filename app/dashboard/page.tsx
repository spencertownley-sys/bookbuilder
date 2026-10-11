import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { requirePageUser } from "@/lib/page-auth";
import ShelfClient from "./ShelfClient";

export const metadata = { title: "My books — Book Builder" };

export default async function Dashboard() {
  const { userId, plan } = await requirePageUser("/dashboard");
  return (
    <>
      <SiteNav />
      <section className="section" style={{ paddingTop: 10 }}>
        <ShelfClient userId={userId} plan={plan} />
      </section>
      <SiteFooter />
    </>
  );
}
