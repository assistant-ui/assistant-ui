import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CartView } from "@/components/pages/shop/cart-view";
import { PageFrame } from "@/components/shared/page-frame";
import { checkoutEnabled } from "@/lib/checkout/config";

export const metadata: Metadata = {
  title: "Cart | Components",
  description: "Review what your coding agent will install.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  if (!checkoutEnabled) notFound();
  return (
    <PageFrame pad="sub">
      <Suspense>
        <CartView />
      </Suspense>
    </PageFrame>
  );
}
