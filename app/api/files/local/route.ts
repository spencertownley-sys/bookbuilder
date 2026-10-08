import { writeLocalSigned } from "@/lib/storage";

// Development-only target for direct uploads (production uploads go straight to Supabase Storage).
export async function PUT(req: Request) {
  const u = new URL(req.url);
  const declared = Number(req.headers.get("content-length") ?? 0);
  try {
    const body = await req.arrayBuffer();
    if (declared && body.byteLength !== declared) throw new Error("The upload was cut short. Please try again.");
    await writeLocalSigned(u.searchParams.get("key") ?? "", u.searchParams.get("sig") ?? "", body);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
