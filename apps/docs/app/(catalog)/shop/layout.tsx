import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { checkoutEnabled } from "@/lib/checkout/config";

export default function ShopLayout({ children }: { children: ReactNode }) {
  if (!checkoutEnabled) notFound();
  return children;
}
