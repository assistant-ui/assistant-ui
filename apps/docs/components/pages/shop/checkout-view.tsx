"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  LoaderCircleIcon,
  WifiOffIcon,
  PanelRightIcon,
  SquareIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { StatewireClient } from "statewire";
import { Button, buttonVariants } from "@/components/ui/button";
import { DotMatrix } from "@/components/ui/dot-matrix";
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
import {
  AgentAvatar,
  AgentStatus,
  agentPhase,
  useAgentName,
} from "@/components/pages/shop/agent-status";
import { FinishProposal } from "@/components/pages/shop/finish-proposal";
import { SetupProgress } from "@/components/pages/shop/setup-progress";
import { setupStages } from "@/components/pages/shop/setup-stages";
import { SetupConversation } from "@/components/pages/shop/setup-conversation";
import { InstallSteps } from "@/components/pages/shop/install-steps";
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
import { SetupIntro } from "@/components/pages/shop/setup-intro";
import {
  acknowledgeSetupIntro,
  useCheckoutSession,
} from "@/lib/checkout/session-store";
import { finishProposed } from "@/lib/checkout/protocol";
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
        className="text-muted-foreground hover:text-destructive w-full justify-start"
        onClick={() => setOpen(true)}
      >
        <SquareIcon aria-hidden className="size-3.5" />
        End setup…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          finalFocus={trigger}
          className="gap-0 overflow-hidden p-0 motion-reduce:animate-none sm:max-w-md"
        >
          <DialogHeader className="px-6 pt-7 pb-6">
            <DialogTitle className="font-display text-xl leading-snug">
              End this setup?
            </DialogTitle>
            <DialogDescription className="max-w-[36ch] leading-relaxed">
              Your agent will be told to stop and the progress shown here will
              be lost.{fromCart ? " Its products go back into your cart." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-foreground/10 bg-foreground/[0.025] border-t px-6 py-4">
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

function SetupDetails({
  checkout,
  compactAgent = false,
}: {
  checkout: CheckoutContextValue;
  compactAgent?: boolean;
}) {
  const products = checkout.state?.products.length
    ? checkout.state.products
    : checkout.session.products.map((slug) => ({
        slug,
        name: getCatalogItem(slug)?.name ?? slug,
      }));
  return (
    <>
      <section aria-label="Components" className="pb-7">
        <h2 className="text-muted-foreground mb-4 text-sm font-medium">
          In this setup
        </h2>
        <ul role="list" className="flex flex-col gap-3">
          {products.map((product) => (
            <li
              key={product.slug}
              className="flex items-center gap-2.5 text-sm"
            >
              <span
                className="bg-foreground/[0.06] size-1.5 shrink-0 rounded-full"
                aria-hidden
              />
              <span className="font-mono">{product.name}</span>
            </li>
          ))}
        </ul>
      </section>
      <SetupProgress
        state={checkout.state}
        ordered
        className="border-foreground/10 mt-0 border-t pt-6"
        buildSteps={
          checkout.state && checkout.state.steps.length > 0 ? (
            <InstallSteps checkout={checkout} state={checkout.state} />
          ) : undefined
        }
      />
      <div className="mt-auto pt-8">
        <AgentStatus checkout={checkout} compact={compactAgent} />
      </div>
    </>
  );
}

function SessionView({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const name = useAgentName(checkout);
  const { leaveSetup } = useSetupNavigation();
  const fromCart = checkout.session.fromCart === true;
  const { state } = checkout;
  const done = state?.status === "done";
  const cancelled = state?.status === "cancelled";
  const closed = done || cancelled;
  const phase = agentPhase(checkout);
  const connecting = phase === "unconnected" || phase === "waiting";
  useEffect(() => {
    if (!detailsOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setDetailsOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [detailsOpen]);
  const leave = (finished: boolean) => {
    if (finished) finishCheckout();
    else abandonCheckout();
    if (fromCart) router.push(finished ? "/shop" : "/shop/cart");
    else leaveSetup();
  };
  const awaitingStart = state?.status === "waiting";
  const stages = setupStages(state, true);
  const activeStage = stages.find((stage) => stage.active);
  const progressLabel = cancelled
    ? "Setup cancelled"
    : done
      ? "Setup complete"
      : checkout.degraded
        ? "Reconnecting"
        : checkout.openInputs.some((input) => !input.optional)
          ? "Waiting for your input"
          : checkout.planPending
            ? "Ready for review"
            : (activeStage?.label ?? "Setup");

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
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="font-display text-base font-medium">Setup</h1>
            <span className="text-muted-foreground hidden text-sm sm:inline">
              Build with your agent
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <BookOpenIcon aria-hidden />
            Docs
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
          <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Setup details"
                  className="lg:hidden"
                />
              }
            >
              <PanelRightIcon aria-hidden="true" />
              Details
            </SheetTrigger>
            <SheetContent className="gap-0 data-[side=right]:w-full motion-reduce:animate-none sm:data-[side=right]:max-w-sm">
              <SheetHeader className="border-foreground/10 shrink-0 border-b px-6 py-7">
                <SheetTitle className="font-display text-xl">
                  Your setup
                </SheetTitle>
                <SheetDescription className="leading-relaxed">
                  Components, agent connection, and installation progress.
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
                <SetupDetails checkout={checkout} />
              </div>
              {!closed ? (
                <SheetFooter className="border-foreground/10 shrink-0 border-t p-5">
                  <EndSessionButton checkout={checkout} />
                </SheetFooter>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <ConnectionNotice
        connection={checkout.connection}
        degraded={checkout.degraded}
      />
      {phase === "quiet" && !awaitingStart && !checkout.degraded ? (
        <div
          role="status"
          className="border-foreground/10 bg-muted/40 flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2 text-sm"
        >
          <WifiOffIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{name} disconnected.</span>
          <Button
            size="sm"
            variant="outline"
            className="lg:hidden"
            onClick={() => setDetailsOpen(true)}
          >
            Reconnect agent
          </Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Setup overview"
          className="border-foreground/10 bg-foreground/[0.015] hidden w-80 shrink-0 flex-col overflow-y-auto border-r px-6 py-7 lg:flex xl:w-96"
        >
          <SetupDetails checkout={checkout} compactAgent={phase !== "quiet"} />
          {!closed ? (
            <div className="pt-4">
              <EndSessionButton checkout={checkout} />
            </div>
          ) : null}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="border-foreground/10 border-b px-5 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{progressLabel}</span>
              {activeStage ? (
                <span className="text-muted-foreground font-mono text-xs">
                  {stages.indexOf(activeStage) + 1} / {stages.length}
                </span>
              ) : null}
            </div>
            <div aria-hidden className="mt-2.5 flex gap-1.5">
              {stages.map((stage) => (
                <span
                  key={stage.id}
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    stage.done
                      ? "bg-foreground/60"
                      : stage.active
                        ? "bg-blue-500"
                        : "bg-foreground/10",
                  )}
                />
              ))}
            </div>
          </div>
          {phase === "unconnected" && !checkout.session.introSeen ? (
            <SetupIntro onContinue={acknowledgeSetupIntro} />
          ) : connecting || awaitingStart ? (
            <div className="flex min-h-0 flex-1 overflow-y-auto">
              <div className="m-auto flex w-full max-w-md flex-col gap-5 px-4 py-8 sm:px-6">
                <div className="flex flex-col gap-4">
                  <AgentAvatar checkout={checkout} />
                  <h2 className="text-lg font-medium">
                    {phase === "connected"
                      ? `${name} is connected`
                      : phase === "quiet"
                        ? "Reconnect your agent"
                        : phase === "waiting"
                          ? "Connecting your agent"
                          : "Connect your coding agent"}
                  </h2>
                </div>
                <AgentStatus checkout={checkout} inline />
              </div>
            </div>
          ) : (
            <SetupConversation
              key={checkout.session.id}
              checkout={checkout}
              agentName={name}
              completion={
                closed ? (
                  <div className="flex items-center justify-between gap-4 py-2">
                    <p className="text-base font-medium sm:text-sm">
                      {done ? "Setup complete" : "Setup cancelled"}
                    </p>
                    <Button onClick={() => leave(done)}>
                      {done ? "Finish" : fromCart ? "Back to cart" : "Close"}
                    </Button>
                  </div>
                ) : state !== undefined && finishProposed(state) ? (
                  <FinishProposal
                    checkout={checkout}
                    agentName={name}
                    onClosed={() => leave(true)}
                  />
                ) : undefined
              }
            />
          )}
        </div>
      </div>
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
      <div
        role="status"
        className="m-auto flex flex-col items-center gap-4 px-6 text-center"
      >
        <DotMatrix state="connecting" aria-hidden className="size-7" />
        <p className="font-medium">Connecting to your setup…</p>
        <p className="text-muted-foreground text-sm">
          Your conversation and progress will appear here.
        </p>
      </div>
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
