import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/pages/catalog/checkout-view";

export const metadata: Metadata = {
  title: "Setup | Catalog",
  description: "Follow your coding agent as it sets up your project.",
  robots: { index: false, follow: true },
};

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default function SetupPage() {
  return (
    <main className="bg-background isolate flex h-dvh min-h-0 flex-col overflow-hidden">
      <Suspense>
        <CheckoutView />
      </Suspense>
    </main>
  );
}
