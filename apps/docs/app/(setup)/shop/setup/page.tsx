import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckoutView } from "@/components/pages/shop/checkout-view";
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
    <main className="bg-muted/40 dark:bg-background isolate flex h-dvh min-h-0 items-center justify-center overflow-hidden p-4 sm:p-8">
      <Suspense>
        <CheckoutView />
      </Suspense>
    </main>
  );
}
