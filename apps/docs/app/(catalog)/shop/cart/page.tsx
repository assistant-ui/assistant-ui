import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/pages/catalog/cart-view";
import { PageFrame } from "@/components/shared/page-frame";

export const metadata: Metadata = {
  title: "Cart | Catalog",
  description: "Review what your coding agent will install.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <PageFrame pad="sub">
      <Suspense>
        <CartView />
      </Suspense>
    </PageFrame>
  );
}
