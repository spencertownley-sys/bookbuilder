import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { requirePageUser } from "@/lib/page-auth";
import { launchMetrics, openReports } from "@/lib/metrics";
import ReportActions from "./ReportActions";

export const metadata = { title: "Launch metrics — Book Builder", robots: { index: false } };

// Only for admins listed in ADMIN_USER_IDS or ADMIN_EMAILS.
export default async function Admin({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { isAdmin } = await requirePageUser("/admin");
  if (!isAdmin) notFound();
  const days = Math.min(365, Math.max(1, Number((await searchParams).days) || 90));
  const [{ metrics, since }, reports] = await Promise.all([launchMetrics(days), openReports()]);
  return (
    <>
      <SiteNav />
      <main className="section admin">
        <div className="shelf-head">
          <h2>Launch metrics</h2>
          <span className="badge soft">Since {since.toLocaleDateString()}</span>
          <span style={{ flex: 1 }} />
          {[30, 90, 365].map((d) => (
            <a key={d} className={"btn small " + (d === days ? "primary" : "ghost")} href={`/admin?days=${d}`}>{d} days</a>
          ))}
        </div>
        <div className="table-wrap">
          <table className="metrics">
            <thead>
              <tr><th>Metric</th><th>Now</th><th>Target</th><th>Definition</th></tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.label}</b></td>
                  <td className={m.met === null ? "" : m.met ? "met" : "miss"}>
                    {m.value}
                    {m.detail && <div className="fineprint">{m.detail}</div>}
                  </td>
                  <td>{m.target}</td>
                  <td className="hint">{m.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fineprint">Targets are the PRD&apos;s starting guesses for the first 90 days after launch.</p>

        <h3 className="admin-h">Open reports ({reports.length})</h3>
        {reports.length === 0 && <p className="hint">Nothing to review.</p>}
        <ul className="reports">
          {reports.map((r) => (
            <li key={r.id} className="card">
              <div className="order-top">
                <div>
                  <strong>{r.reason}</strong>
                  <p className="hint">
                    {r.reporter === "author" ? "Author reported a note" : "Viewer reported the book"} · {r.title ?? "deleted book"} · {r.created_at.toLocaleString()}
                  </p>
                </div>
                <ReportActions id={r.id} hasBook={Boolean(r.title)} />
              </div>
              {r.details && <p className="report-details">{r.details}</p>}
              {r.book_id && <p className="fineprint">Book {r.book_id}{r.owner_id ? ` · owner ${r.owner_id}` : ""}</p>}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
