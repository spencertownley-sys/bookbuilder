import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { isAdultConfirmed, safeNext } from "@/lib/site";
import WelcomeClient from "./WelcomeClient";

export const metadata = { title: "Welcome — Book Builder" };

// One-time step after sign-up: accounts are for adults (keeps us out of COPPA's rules for collecting
// data from children) and everyone accepts the Terms and Privacy Policy.
export default async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await auth.protect();
  const user = await currentUser();
  const next = safeNext((await searchParams).next);
  if (isAdultConfirmed(user?.publicMetadata)) redirect(next);
  return (
    <>
      <SiteNav />
      <section className="section narrow">
        <WelcomeClient next={next} firstName={user?.firstName ?? ""} />
      </section>
    </>
  );
}
