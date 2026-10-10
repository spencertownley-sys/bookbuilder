import "server-only";
import { luluConfigured, luluCost } from "./lulu";
import { PrintFormat, ShipTo, ShippingLevel, SHIPPING, podPackageId, printedPageCount, unitPriceCents, validateShipTo } from "./printing";
import { HttpError } from "./server";

export interface Quote {
  format: PrintFormat;
  quantity: number;
  pages: number; // pages as printed (after padding)
  podPackageId: string;
  unitCents: number;
  itemsCents: number;
  shippingCents: number;
  totalCents: number;
  shippingEstimated: boolean;
  printCostCents?: number; // what Lulu charges us incl. shipping and tax, when Lulu is connected
}

/** Customer price: our retail price per book + shipping at Lulu's cost (or a flat estimate before Lulu is connected). */
export async function quote(format: PrintFormat, bookPages: number, quantity: number, level: ShippingLevel, shipTo?: ShipTo): Promise<Quote> {
  if (format !== "hardcover" && format !== "paperback") throw new HttpError(400, "Choose hardcover or paperback.");
  if (!SHIPPING[level]) throw new HttpError(400, "Choose a shipping speed.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new HttpError(400, "Order between 1 and 50 copies.");
  const pages = printedPageCount(format, bookPages);
  const pod = podPackageId(format, pages);
  const unit = unitPriceCents(format, bookPages);
  let shipping = SHIPPING[level].fallbackCents + (quantity - 1) * 150;
  let estimated = true;
  let printCost: number | undefined;
  if (shipTo && luluConfigured() && !validateShipTo(shipTo)) {
    try {
      const cost = await luluCost(pod, pages, quantity, shipTo, level);
      shipping = cost.shippingCents;
      printCost = cost.totalCents;
      estimated = false;
    } catch {
      // keep the estimate; Lulu's exact figure is fetched again at checkout
    }
  }
  return { format, quantity, pages, podPackageId: pod, unitCents: unit, itemsCents: unit * quantity, shippingCents: shipping, totalCents: unit * quantity + shipping, shippingEstimated: estimated, printCostCents: printCost };
}
