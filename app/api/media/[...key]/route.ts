import { getFile } from "@/lib/storage";

// Serves stored files. Keys are random 24-character ids, so a URL is only known to people it was shared with.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const file = await getFile(key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex",
    },
  });
}
