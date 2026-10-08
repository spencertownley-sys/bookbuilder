import { verifyLuluSignature, LuluJob } from "@/lib/lulu";
import { applyLuluStatus } from "@/lib/fulfill";

// Lulu calls this when a print job changes status (topic PRINT_JOB_STATUS_CHANGED).
// Register it once: POST /webhooks/ {"topics":["PRINT_JOB_STATUS_CHANGED"],"url":"https://YOUR_DOMAIN/api/webhooks/lulu"}
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyLuluSignature(raw, req.headers.get("lulu-hmac-sha256"))) return new Response("bad signature", { status: 401 });
  const { topic, data } = JSON.parse(raw) as { topic: string; data: LuluJob & { external_id?: string } };
  if (topic !== "PRINT_JOB_STATUS_CHANGED" || !data) return Response.json({ ignored: true });
  await applyLuluStatus(String(data.id), data);
  return Response.json({ ok: true });
}
