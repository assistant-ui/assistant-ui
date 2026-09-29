"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupWizard } from "@/components/pages/shop/setup-wizard";
import {
  useCheckout,
  useCheckoutFailed,
  type CheckoutContextValue,
} from "@/components/shared/checkout-provider";
import { typeDeck, typePage } from "@/components/shared/type";
import { useCart } from "@/lib/catalog/cart-store";
import { abandonCheckout, checkoutCart } from "@/lib/checkout/flow";
import { useCheckoutSession } from "@/lib/checkout/session-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

function EmptyState() {
  return (
    <div className="max-w-xl">
      <h1 className={cn(typePage, "text-2xl md:text-2xl")}>
        Nothing here yet.
      </h1>
      <p className={cn("mt-4", typeDeck)}>
        Add a product from the shop, then start setup to have your coding agent
        install it.
      </p>
      <Button
        nativeButton={false}
        className="mt-8"
        render={<Link href="/shop" />}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Browse the shop
      </Button>
    </div>
  );
}

function StartState({ count }: { count: number }) {
  return (
    <div className="max-w-xl">
      <h1 className={cn(typePage, "text-2xl md:text-2xl")}>Start setup</h1>
      <p className={cn("mt-4", typeDeck)}>
        Your cart holds {count} {count === 1 ? "product" : "products"}. Starting
        opens a session that your coding agent joins from your terminal.
      </p>
      <Button className="mt-8" onClick={() => checkoutCart()}>
        Start setup
      </Button>
    </div>
  );
}

function UnreadableState() {
  return (
    <div className="max-w-xl">
      <h1 className={cn(typePage, "text-2xl md:text-2xl")}>
        This setup cannot be read.
      </h1>
      <p className={cn("mt-4", typeDeck)}>
        The session sent something this page does not understand, most likely
        from a different version. End it and start again.
      </p>
      <Button className="mt-8" onClick={() => abandonCheckout()}>
        End setup
      </Button>
    </div>
  );
}

export function CheckoutView() {
  const hydrated = useHydrated();
  const slugs = useCart();
  const session = useCheckoutSession();
  const checkout = useCheckout();
  const failed = useCheckoutFailed();
  const [exiting, setExiting] = useState<CheckoutContextValue | null>(null);

  if (!hydrated) return null;
  const shown = checkout ?? (session === null ? exiting : null);
  if (shown !== null)
    return (
      <SetupWizard
        key={shown.session.id}
        checkout={shown}
        onExit={() => setExiting(shown)}
      />
    );
  if (session !== null && !failed) {
    return (
      <p role="status" className="text-muted-foreground">
        Connecting to your setup…
      </p>
    );
  }
  return (
    <div className="border-foreground/10 bg-background w-full max-w-xl rounded-2xl border p-6 shadow-lg sm:p-8">
      {failed ? (
        <UnreadableState />
      ) : slugs.length === 0 ? (
        <EmptyState />
      ) : (
        <StartState count={slugs.length} />
      )}
    </div>
  );
}
