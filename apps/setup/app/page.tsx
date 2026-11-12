import { Suspense } from "react";
import { CheckoutProvider } from "@/components/checkout-provider";
import { SetupFrame } from "@/components/setup-frame";
import { CheckoutView } from "@/components/wizard/checkout-view";

export default function SetupPage() {
  return (
    <SetupFrame>
      <Suspense>
        <CheckoutProvider>
          <CheckoutView />
        </CheckoutProvider>
      </Suspense>
    </SetupFrame>
  );
}
