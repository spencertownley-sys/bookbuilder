import { NextResponse } from "next/server";
import { consumeAiCredit } from "@/lib/plan-server";

// Image generation behind a provider switch. Pick the cheapest that looks good to you:
//   AI_IMAGE_PROVIDER=fal     -> FLUX schnell on fal.ai (fractions of a cent per image)
//   AI_IMAGE_PROVIDER=openai  -> gpt-image-1 (supports transparent stickers)
// Every prompt is wrapped so output stays wholesome and picture-book styled.

const BLOCK = /\b(nude|naked|sexy|blood|gore|gun|weapon|kill|drugs?|violent|scary|horror)\b/i;

export async function POST(req: Request) {
  const { prompt, kind } = (await req.json()) as { prompt: string; kind: "scene" | "sticker" };
  if (!prompt || prompt.length > 400) return NextResponse.json({ error: "Describe the picture in a sentence or two." }, { status: 400 });
  if (BLOCK.test(prompt)) return NextResponse.json({ error: "Let's keep it picture-book friendly — try another idea!" }, { status: 400 });

  const credit = await consumeAiCredit();
  if (!credit.ok) return NextResponse.json({ error: credit.reason }, { status: 402 });

  const safe =
    `Wholesome children's picture book illustration, gentle and friendly, no text or lettering. ${prompt}.` +
    (kind === "sticker" ? " Single isolated subject, centered, on a plain white background." : " Full scene, leave open space for text.");

  try {
    const provider = process.env.AI_IMAGE_PROVIDER ?? "fal";
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: safe,
          size: "1024x1024",
          quality: "medium",
          ...(kind === "sticker" ? { background: "transparent" } : {}),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message ?? "generation failed");
      return NextResponse.json({ url: `data:image/png;base64,${j.data[0].b64_json}`, left: credit.left });
    }
    const r = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${process.env.FAL_KEY}` },
      body: JSON.stringify({ prompt: safe, image_size: "square_hd", num_images: 1, enable_safety_checker: true }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail ?? "generation failed");
    return NextResponse.json({ url: j.images[0].url, left: credit.left });
  } catch (e) {
    return NextResponse.json({ error: "The paintbrush slipped — " + (e as Error).message }, { status: 500 });
  }
}
