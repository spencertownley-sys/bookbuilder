import { getOwnedBook, json, requireUser, route } from "@/lib/server";
import { quote } from "@/lib/quote";
import type { PrintFormat, ShipTo, ShippingLevel } from "@/lib/printing";

// POST { bookId, format, quantity, shippingLevel, shipTo? } → price breakdown
export const POST = route(async (req: Request) => {
  const { userId } = await requireUser();
  const b = (await req.json()) as { bookId: string; format: PrintFormat; quantity: number; shippingLevel: ShippingLevel; shipTo?: ShipTo };
  const book = await getOwnedBook(b.bookId, userId);
  return json(await quote(b.format, book.data.pages.length, Number(b.quantity), b.shippingLevel, b.shipTo));
});
