import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { requirePageUser } from "@/lib/page-auth";
import AccountClient from "./AccountClient";

export const metadata = { title: "Account — Book Builder" };

export default async function Account() {
  const { email, plan, hasBilling, isAdmin } = await requirePageUser("/account");
  return (
    <>
      <SiteNav />
      <section className="section narrow">
        <AccountClient email={email} planName={plan.name} isFree={plan.id === "free"} hasBilling={hasBilling} isAdmin={isAdmin} />
      </section>
      <SiteFooter />
    </>
  );
}
