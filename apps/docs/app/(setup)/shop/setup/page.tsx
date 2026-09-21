import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckoutView } from "@/components/pages/catalog/checkout-view";
import { checkoutEnabled } from "@/lib/checkout/config";

export const metadata: Metadata = {
  title: "Setup | Shop",
  description: "Follow your coding agent as it sets up your project.",
  robots: { index: false, follow: true },
};

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default function SetupPage() {
  if (!checkoutEnabled) notFound();
  return (
    <main className="bg-background isolate flex h-dvh min-h-0 flex-col overflow-hidden">
      <Suspense>
        <CheckoutView />
      </Suspense>
    </main>
  );
}
