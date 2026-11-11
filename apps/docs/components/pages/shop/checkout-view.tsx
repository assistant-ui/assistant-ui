"use client";

import { useEffect, useState } from "react";
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
import { useCart, useCartEntries } from "@/lib/catalog/cart-store";
import {
  abandonCheckout,
  checkoutCart,
  connectAgentSetup,
} from "@/lib/checkout/flow";
import {
  parseAgentFragment,
  useCheckoutSession,
} from "@/lib/checkout/session-store";
import { AgentLinkConfirm } from "@/components/pages/shop/agent-link-confirm";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

function EmptyState() {
  return (
    <div className="max-w-xl">
      <h1 className={cn(typePage, "text-2xl md:text-2xl")}>
        Nothing here yet.
      </h1>
      <p className={cn("mt-4", typeDeck)}>
        Add a product from the Components page, then start setup to have your
        coding agent install it.
      </p>
      <Button
        nativeButton={false}
        className="mt-8"
        render={<Link href="/components" />}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Browse components
      </Button>
    </div>
  );
}

function StartState({
  count,
  needsConfiguration,
}: {
  count: number;
  needsConfiguration: boolean;
}) {
  return (
    <div className="max-w-xl">
      <h1 className={cn(typePage, "text-2xl md:text-2xl")}>Start setup</h1>
      <p className={cn("mt-4", typeDeck)}>
        {needsConfiguration ? (
          "Choose what each agent tool should do in your cart before starting setup."
        ) : (
          <>
            Your cart holds {count} {count === 1 ? "product" : "products"}.
            Starting opens a session that your coding agent joins from your
            terminal.
          </>
        )}
      </p>
      {needsConfiguration ? (
        <Button
          nativeButton={false}
          className="mt-8"
          render={<Link href="/components/cart" />}
        >
          Configure tools
        </Button>
      ) : (
        <Button className="mt-8" onClick={() => checkoutCart("checkout_page")}>
          Start setup
        </Button>
      )}
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

type AgentFragment = NonNullable<ReturnType<typeof parseAgentFragment>>;
const pendingKey = "aui-agent-link-pending";

const readPending = (): AgentFragment | null => {
  try {
    return parseAgentFragment(sessionStorage.getItem(pendingKey) ?? "");
  } catch {
    return null;
  }
};

const writePending = (fragment: string | null) => {
  try {
    if (fragment === null) sessionStorage.removeItem(pendingKey);
    else sessionStorage.setItem(pendingKey, fragment);
  } catch {
    // Storage can be blocked; the request then lives until the tab reloads.
  }
};

/**
 * The setup a coding agent opened this page on (`#link=…&setup=…`), waiting
 * for the user to connect to it. The fragment leaves the address bar at
 * once; the request is kept for this tab only, never as the browser's link.
 */
function usePendingAgentLink() {
  const [pending, setPending] = useState<AgentFragment | null>(() =>
    typeof window === "undefined"
      ? null
      : (parseAgentFragment(window.location.hash) ?? readPending()),
  );
  useEffect(() => {
    if (parseAgentFragment(window.location.hash) === null) return;
    writePending(window.location.hash);
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);
  const settle = () => {
    writePending(null);
    setPending(null);
  };
  return { pending, settle };
}

export function CheckoutView() {
  const { pending, settle } = usePendingAgentLink();
  const hydrated = useHydrated();
  const slugs = useCart();
  const entries = useCartEntries();
  const session = useCheckoutSession();
  const checkout = useCheckout();
  const failed = useCheckoutFailed();
  const [exiting, setExiting] = useState<CheckoutContextValue | null>(null);

  if (!hydrated) return null;
  if (pending !== null && session?.link !== pending.link)
    return (
      <AgentLinkConfirm
        link={pending.link}
        onConnect={() => {
          connectAgentSetup(pending.link, pending.setup);
          settle();
        }}
        onCancel={settle}
      />
    );
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
    <div className="ring-foreground/10 bg-background w-full max-w-xl rounded-xl p-6 ring-1 sm:p-8">
      {failed ? (
        <UnreadableState />
      ) : slugs.length === 0 ? (
        <EmptyState />
      ) : (
        <StartState
          count={slugs.length}
          needsConfiguration={entries.includes("agent-tools")}
        />
      )}
    </div>
  );
}
