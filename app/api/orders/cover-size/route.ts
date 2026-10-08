import { coverDimensions, luluConfigured } from "@/lib/lulu";
import { BLEED_IN } from "@/lib/book";
import { HttpError, json, requireUser, route } from "@/lib/server";
import { FORMATS, PrintFormat, podPackageId, printedPageCount } from "@/lib/printing";

// POST { format, pages } → the cover spread size Lulu expects, in inches.
export const POST = route(async (req: Request) => {
  await requireUser();
  const { format, pages } = (await req.json()) as { format: PrintFormat; pages: number };
  if (!FORMATS[format]) throw new HttpError(400, "Unknown format.");
  const printed = printedPageCount(format, pages);
  const pod = podPackageId(format, printed);
  if (luluConfigured()) {
    const d = await coverDimensions(pod, printed);
    return json({ ...d, exact: true, pages: printed });
  }
  // Estimate used only before Lulu is connected (dev / previews): paperback spread with bleed;
  // hardcover adds roughly 0.75" of board wrap on each edge.
  const spine = pod.includes(".SS.") ? 0 : printed / 444 + 0.06;
  const wrap = format === "hardcover" ? 0.75 : BLEED_IN;
  return json({ width: 8.5 * 2 + spine + wrap * 2, height: 8.5 + wrap * 2, exact: false, pages: printed });
});
