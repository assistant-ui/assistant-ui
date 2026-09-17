import type { Metadata } from "next";
import { Suspense } from "react";
import { Checkout } from "@/components/pages/catalog/checkout";
import { PageFrame } from "@/components/shared/page-frame";

export const metadata: Metadata = {
  title: "Cart | Catalog",
  description: "Install everything in your cart with one prompt.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <PageFrame pad="sub">
      <Suspense>
        <Checkout />
      </Suspense>
    </PageFrame>
  );
}
