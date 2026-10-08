import SiteNav from "@/components/SiteNav";
import NewBookClient from "./NewBookClient";

export const metadata = { title: "Start a book — Book Builder" };

export default function NewBook() {
  return (
    <>
      <SiteNav />
      <section className="section" style={{ paddingTop: 8 }}>
        <NewBookClient />
      </section>
    </>
  );
}
