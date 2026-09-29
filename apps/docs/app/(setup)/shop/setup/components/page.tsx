import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentViewer } from "@/components/pages/shop/component-viewer";
import { checkoutEnabled } from "@/lib/checkout/config";

export const metadata: Metadata = {
  title: "Wizard components | Shop",
  robots: { index: false, follow: false },
};

export default function ComponentsPage() {
  if (!checkoutEnabled) notFound();
  return <ComponentViewer />;
}
