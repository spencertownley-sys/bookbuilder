import SiteNav from "@/components/SiteNav";
import { requirePageUser } from "@/lib/page-auth";
import NewBookClient from "./NewBookClient";

export const metadata = { title: "Start a book — Book Builder" };

export default async function NewBook() {
  await requirePageUser("/new");
  return (
    <>
      <SiteNav />
      <section className="section" style={{ paddingTop: 8 }}>
        <NewBookClient />
      </section>
    </>
  );
}
