import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/pages/catalog/checkout-view";
import { PageFrame } from "@/components/shared/page-frame";

export const metadata: Metadata = {
  title: "Checkout | Catalog",
  description: "Install everything in your cart with one prompt.",
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return (
    <PageFrame pad="sub">
      <Suspense>
        <CheckoutView />
      </Suspense>
    </PageFrame>
  );
}
