"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  LoaderCircleIcon,
  WifiOffIcon,
  PanelRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { StatewireClient } from "statewire";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSetupNavigation } from "@/components/shared/setup-navigation";
import { NavGlyph } from "@/components/shared/nav-glyph";
import {
  AgentStatus,
  agentPhase,
  useAgentName,
} from "@/components/pages/shop/agent-status";
import { SetupProgress } from "@/components/pages/shop/setup-progress";
import { SetupConversation } from "@/components/pages/shop/setup-conversation";
import {
  TimelineEntry,
  type EntryStatus,
} from "@/components/pages/shop/timeline";
import {
  useCheckout,
  useCheckoutFailed,
  type CheckoutContextValue,
} from "@/components/shared/checkout-provider";
import { typeDeck, typePage } from "@/components/shared/type";
import { getCatalogItem } from "@/lib/catalog";
import { useCart } from "@/lib/catalog/cart-store";
import {
  abandonCheckout,
  checkoutCart,
  finishCheckout,
} from "@/lib/checkout/flow";
import { useCheckoutSession } from "@/lib/checkout/session-store";
import type { Checkout } from "@/lib/checkout/protocol";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

function EmptyState() {
  return (
    <div className="max-w-xl">
      <h1 className={typePage}>Nothing here yet.</h1>
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

function ConnectionNotice({
  connection,
  degraded,
}: {
  connection: StatewireClient.Connection;
  degraded: boolean;
}) {
  if (!degraded) return null;
  const retrying = connection.status === "retrying";
  return (
    <div
      role="status"
      className="border-foreground/10 bg-muted/40 flex shrink-0 flex-wrap items-center justify-center gap-3 border-b px-4 py-2 text-sm"
    >
      {retrying ? (
        <LoaderCircleIcon className="size-4 shrink-0 animate-spin" />
      ) : (
        <WifiOffIcon className="text-destructive size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        {retrying
          ? `Reconnecting to the setup (attempt ${connection.attempt})…`
          : `Lost the connection to the setup${
              connection.degraded && connection.message
                ? `: ${connection.message}`
                : "."
            }`}
      </span>
      <Button size="sm" variant="outline" onClick={connection.reconnect}>
        Retry now
      </Button>
    </div>
  );
}

function EndSessionButton({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const { leaveSetup } = useSetupNavigation();
  const fromCart = checkout.session.fromCart === true;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const end = async () => {
    try {
      await checkout.commands["checkout/cancel"]();
    } catch {
      toast.warning(
        "Could not reach the session. Your agent may keep working until it times out.",
      );
    }
    abandonCheckout();
    if (fromCart) router.push("/shop/cart");
    else leaveSetup();
  };
  return (
    <>
      <Button
        ref={trigger}
        variant="outline"
        className="text-destructive w-full"
        onClick={() => setOpen(true)}
      >
        End setup…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent finalFocus={trigger}>
          <DialogHeader>
            <DialogTitle>End this setup?</DialogTitle>
            <DialogDescription>
              Your agent will be told to stop and the progress shown here will
              be lost.{fromCart ? " Its products go back into your cart." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep going
            </DialogClose>
            <Button variant="destructive" onClick={end}>
              End setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InstallSteps({
  checkout,
  state,
}: {
  checkout: CheckoutContextValue;
  state: Checkout.State;
}) {
  const done = state.status === "done";
  const cancelled = state.status === "cancelled";
  const closed = done || cancelled;
  const steps = state.steps;
  const products = state.products;
  let lastProduct: string | undefined;

  return (
    <ol role="list" aria-label="Installation steps" className="flex flex-col">
      {steps.map((step) => {
        const inputs = checkout.openInputs.filter(
          (input) => input.stepId === step.id,
        );
        const status: EntryStatus =
          !closed && inputs.length > 0 ? "attention" : step.status;
        const product =
          step.product !== undefined && step.product !== lastProduct
            ? products.find((entry) => entry.slug === step.product)
            : undefined;
        lastProduct = step.product ?? lastProduct;
        const glyph = product ? getCatalogItem(product.slug)?.glyph : undefined;
        return (
          <TimelineEntry
            key={step.id}
            status={status}
            title={step.title}
            detail={step.note ?? step.detail}
            eyebrow={
              product && products.length > 1 ? (
                <p className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  {glyph ? <NavGlyph kind={glyph} size="sm" /> : null}
                  {product.name}
                </p>
              ) : undefined
            }
          />
        );
      })}
    </ol>
  );
}

function SessionView({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const name = useAgentName(checkout);
  const { leaveSetup } = useSetupNavigation();
  const fromCart = checkout.session.fromCart === true;
  const { state } = checkout;
  const done = state?.status === "done";
  const cancelled = state?.status === "cancelled";
  const closed = done || cancelled;
  const phase = agentPhase(checkout);
  const connecting = phase === "unconnected" || phase === "waiting";
  const awaitingStart = state?.status === "waiting";

  return (
    <>
      <header className="border-foreground/10 flex shrink-0 items-center justify-between gap-3 border-b px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={leaveSetup}
          >
            <ArrowLeftIcon aria-hidden="true" />
          </Button>
          <h1 className="text-base font-medium">Setup</h1>
        </div>
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="sm" />}>
            <PanelRightIcon data-icon="inline-start" />
            Details
          </SheetTrigger>
          <SheetContent className="gap-0 data-[side=right]:w-full sm:data-[side=right]:max-w-md">
            <SheetHeader className="border-foreground/10 shrink-0 border-b p-5">
              <SheetTitle>Setup details</SheetTitle>
              <SheetDescription>
                Components, agent connection, and installation progress.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <section aria-labelledby="components-heading" className="pb-6">
                <h2
                  id="components-heading"
                  className="mb-3 text-base font-medium sm:text-sm"
                >
                  Components
                </h2>
                <ul role="list" className="flex flex-col gap-3">
                  {checkout.session.products.map((slug) => {
                    const product = getCatalogItem(slug);
                    return (
                      <li
                        key={slug}
                        className="flex items-center gap-2 text-base sm:text-sm"
                      >
                        {product ? (
                          <NavGlyph kind={product.glyph} size="sm" />
                        ) : null}
                        {product?.name ?? slug}
                      </li>
                    );
                  })}
                </ul>
              </section>
              <SetupProgress
                state={state}
                ordered
                buildSteps={
                  state && state.steps.length > 0 ? (
                    <InstallSteps checkout={checkout} state={state} />
                  ) : undefined
                }
              />
              <div className="pt-8">
                <AgentStatus checkout={checkout} />
              </div>
            </div>
            {!closed ? (
              <SheetFooter className="border-foreground/10 shrink-0 border-t p-5">
                <EndSessionButton checkout={checkout} />
              </SheetFooter>
            ) : null}
          </SheetContent>
        </Sheet>
      </header>
      <ConnectionNotice
        connection={checkout.connection}
        degraded={checkout.degraded}
      />
      <SetupConversation
        key={checkout.session.id}
        checkout={checkout}
        agentName={name}
        introduction={
          connecting || awaitingStart ? (
            <div className="border-foreground/20 bg-muted/30 rounded-2xl border p-4 sm:p-5">
              <h3 className="mb-3 text-xl font-medium">
                {phase === "connected"
                  ? "Your agent is connected"
                  : phase === "quiet"
                    ? "Reconnect your agent"
                    : phase === "waiting"
                      ? "Connecting your agent"
                      : "Connect your coding agent"}
              </h3>
              <AgentStatus checkout={checkout} inline />
            </div>
          ) : undefined
        }
        completion={
          closed ? (
            <div className="flex items-center justify-between gap-4 py-2">
              <p className="text-base font-medium sm:text-sm">
                {done ? "Setup complete" : "Setup cancelled"}
              </p>
              <Button
                onClick={() => {
                  if (done) finishCheckout();
                  else abandonCheckout();
                  if (fromCart) router.push(done ? "/shop" : "/shop/cart");
                  else leaveSetup();
                }}
              >
                {done ? "Finish" : fromCart ? "Back to cart" : "Close"}
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}

function StartState({ count }: { count: number }) {
  return (
    <div className="max-w-xl">
      <h1 className={typePage}>Start setup</h1>
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
      <h1 className={typePage}>This setup cannot be read.</h1>
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

  if (!hydrated) return null;
  if (checkout !== null) return <SessionView checkout={checkout} />;
  if (session !== null && !failed) {
    return (
      <p role="status" className="text-muted-foreground m-auto">
        Connecting to your setup…
      </p>
    );
  }
  return (
    <div className="mx-auto w-full max-w-3xl p-6 sm:py-16">
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
