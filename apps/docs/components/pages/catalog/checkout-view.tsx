"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, LoaderCircleIcon, WifiOffIcon } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { NavGlyph } from "@/components/shared/nav-glyph";
import {
  AgentStatus,
  agentPhase,
  useAgentName,
} from "@/components/pages/catalog/agent-status";
import { InputCard } from "@/components/pages/catalog/input-card";
import { PlanCard } from "@/components/pages/catalog/plan-card";
import {
  TimelineEntry,
  type EntryStatus,
} from "@/components/pages/catalog/timeline";
import {
  useCheckout,
  type CheckoutContextValue,
} from "@/components/shared/checkout-provider";
import { typeDeck, typePage } from "@/components/shared/type";
import { getProduct, resolveProducts } from "@/lib/catalog";
import { parseCartItems } from "@/lib/catalog/install-prompt";
import { replaceCart, useCart } from "@/lib/catalog/cart-store";
import {
  abandonCheckout,
  checkoutCart,
  finishCheckout,
} from "@/lib/checkout/flow";
import type { Checkout } from "@/lib/checkout/protocol";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

function EmptyState() {
  return (
    <div className="max-w-xl">
      <h1 className={typePage}>Nothing here yet.</h1>
      <p className={cn("mt-4", typeDeck)}>
        Add a product from the catalog, then check out to have your coding agent
        install it.
      </p>
      <Button
        nativeButton={false}
        className="mt-8"
        render={<Link href="/shop" />}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Browse the catalog
      </Button>
    </div>
  );
}

function StartState({ slugs }: { slugs: readonly string[] }) {
  const products = resolveProducts(slugs);
  return (
    <div className="max-w-xl">
      <h1 className={typePage}>Ready to check out.</h1>
      <p className={cn("mt-4", typeDeck)}>
        Checkout opens a live session your coding agent joins from your machine.
        It plans the install, you approve, and you watch every step land here.
      </p>
      <ul role="list" className="divide-foreground/10 mt-8 divide-y">
        {products.map((product) => (
          <li key={product.slug} className="flex items-center gap-4 py-3">
            <NavGlyph kind={product.glyph} />
            <span className="text-[0.9375rem] font-medium">{product.name}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => checkoutCart()}>Start checkout</Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/shop/cart" />}
        >
          Back to cart
        </Button>
      </div>
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
      className="border-foreground/15 bg-muted/40 mt-6 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      {retrying ? (
        <LoaderCircleIcon className="size-4 shrink-0 animate-spin" />
      ) : (
        <WifiOffIcon className="text-destructive size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        {retrying
          ? `Reconnecting to the checkout (attempt ${connection.attempt})…`
          : `Lost the connection to the checkout${
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
  const end = async () => {
    try {
      await checkout.commands["checkout/cancel"]();
    } catch {
      // The session ends locally either way; the worker's copy expires on its own.
    }
    abandonCheckout();
    router.push("/shop/cart");
  };
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        End session
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this session?</DialogTitle>
          <DialogDescription>
            Your agent will be told to stop and the progress shown here will be
            lost. Its products go back into your cart.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep going
          </DialogClose>
          <Button variant="destructive" onClick={end}>
            End session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({
  title,
  aside,
  id,
}: {
  title: string;
  aside?: ReactNode;
  id: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2
        id={id}
        className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
      >
        {title}
      </h2>
      {aside ? (
        <span className="text-muted-foreground text-xs tabular-nums">
          {aside}
        </span>
      ) : null}
    </div>
  );
}

function LogLines({ entries }: { entries: readonly Checkout.LogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ol className="text-muted-foreground flex flex-col gap-1 font-mono text-[13px] [overflow-wrap:anywhere]">
      {entries.map((entry) => (
        <li key={entry.id}>{entry.text}</li>
      ))}
    </ol>
  );
}

function PlanSection({
  checkout,
  state,
  closed,
}: {
  checkout: CheckoutContextValue;
  state: Checkout.State;
  closed: boolean;
}) {
  const planning = state.status === "planning";
  const plan = checkout.plan;
  const inputs = planning ? checkout.openInputs : [];
  const log = planning
    ? state.log.filter((entry) => entry.stepId === undefined).slice(-6)
    : [];
  const aside = closed
    ? undefined
    : checkout.planPending
      ? "Awaiting your review"
      : plan?.status === "approved"
        ? "Approved"
        : plan?.status === "changes-requested"
          ? "Being revised"
          : "Investigating your project";
  return (
    <section aria-labelledby="plan-heading" className="mt-10">
      <SectionHeading id="plan-heading" title="Plan" aside={aside} />
      <div className="flex flex-col gap-4">
        {planning &&
        plan === undefined &&
        log.length === 0 &&
        inputs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Your agent reads the project and asks only for what it cannot tell
            on its own. The plan lands here for you to approve.
          </p>
        ) : null}
        <LogLines entries={log} />
        {inputs.map((input) => (
          <InputCard key={input.id} input={input} checkout={checkout} />
        ))}
        {plan !== undefined ? (
          <PlanCard plans={state.plans} checkout={checkout} closed={closed} />
        ) : null}
      </div>
    </section>
  );
}

function InstallSection({
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
  const activeId =
    steps.find((step) => step.status === "active")?.id ??
    steps.findLast((step) => step.status !== "pending")?.id;
  const known = new Set(steps.map((step) => step.id));
  const homeOf = (stepId: string | undefined) =>
    stepId !== undefined && known.has(stepId) ? stepId : activeId;
  const inputsFor = (id: string | undefined) =>
    checkout.openInputs.filter((input) => homeOf(input.stepId) === id);
  const approvedAt = checkout.plan?.decidedAt ?? 0;
  const logFor = (id: string | undefined) =>
    state.log
      .filter((entry) => entry.at >= approvedAt && homeOf(entry.stepId) === id)
      .slice(-4);
  const loose = activeId === undefined;
  const { done: doneCount, total } = checkout.progress;
  const products = state.products;
  let lastProduct: string | undefined;

  return (
    <section aria-labelledby="install-heading" className="mt-10">
      <SectionHeading
        id="install-heading"
        title="Install"
        aside={total > 0 ? `${doneCount} of ${total} steps` : undefined}
      />
      {loose ? (
        <div className="mb-4 flex flex-col gap-3">
          <LogLines entries={logFor(undefined)} />
          {inputsFor(undefined).map((input) => (
            <InputCard key={input.id} input={input} checkout={checkout} />
          ))}
        </div>
      ) : null}
      {steps.length === 0 && !closed ? (
        <p className="text-muted-foreground text-sm">
          Your agent lists its steps here as it starts on them.
        </p>
      ) : null}
      <ol className="flex flex-col">
        {steps.map((step) => {
          const inputs = inputsFor(step.id);
          const log = logFor(step.id);
          const status: EntryStatus =
            !closed && inputs.length > 0 ? "attention" : step.status;
          const product =
            step.product !== undefined && step.product !== lastProduct
              ? products.find((entry) => entry.slug === step.product)
              : undefined;
          lastProduct = step.product ?? lastProduct;
          const glyph = product ? getProduct(product.slug)?.glyph : undefined;
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
            >
              {inputs.length > 0 || log.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <LogLines entries={log} />
                  {inputs.map((input) => (
                    <InputCard
                      key={input.id}
                      input={input}
                      checkout={checkout}
                    />
                  ))}
                </div>
              ) : null}
            </TimelineEntry>
          );
        })}
        {closed ? (
          <TimelineEntry
            status={done ? "done" : "blocked"}
            title={done ? "Installed" : "Cancelled"}
          />
        ) : null}
      </ol>
    </section>
  );
}

function SessionView({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const name = useAgentName(checkout);
  const { state } = checkout;
  const status = state?.status ?? "waiting";
  const done = status === "done";
  const cancelled = status === "cancelled";
  const closed = done || cancelled;
  const phase = agentPhase(checkout);
  const degraded = checkout.degraded;
  const installing = status === "installing" || closed;
  const everConnected = (state?.agent.lastSeenAt ?? null) !== null;

  const [headline, deck] = done
    ? ["Installed.", "Everything in your cart is installed and verified."]
    : cancelled
      ? [
          "Cancelled.",
          "This checkout was cancelled. Its products go back into your cart.",
        ]
      : degraded
        ? [
            "Connection lost.",
            "This page is not receiving updates from the checkout right now. Your agent keeps working.",
          ]
        : phase === "unconnected"
          ? [
              "Connect your agent.",
              "Hand the command to your coding agent. The rest of the checkout unfolds here once it is listening.",
            ]
          : phase === "waiting"
            ? [
                `Waiting for ${name}.`,
                "It joins this checkout as soon as it runs the command.",
              ]
            : phase === "quiet"
              ? [
                  "Your agent has gone quiet.",
                  "Its heartbeat stopped. Everything it reported so far is still here.",
                ]
              : checkout.planPending
                ? [
                    "Review the plan.",
                    "Your agent has looked at the project and proposes how to install. Nothing changes until you approve.",
                  ]
                : checkout.openInputs.length > 0
                  ? ["Your agent needs you.", "Answer below and it carries on."]
                  : status === "planning"
                    ? [
                        "Planning.",
                        "Your agent is reading the project. It only asks for what it cannot tell on its own.",
                      ]
                    : [
                        "Installing.",
                        "Watch each step land here and answer when your agent asks.",
                      ];

  return (
    <div className="max-w-2xl">
      <h1 className={typePage}>{headline}</h1>
      <p className={cn("mt-4", typeDeck)}>{deck}</p>
      <ConnectionNotice connection={checkout.connection} degraded={degraded} />

      <div className="mt-8">
        <AgentStatus checkout={checkout} />
      </div>

      {state !== undefined && everConnected ? (
        <PlanSection checkout={checkout} state={state} closed={closed} />
      ) : null}

      {state !== undefined && installing ? (
        <InstallSection checkout={checkout} state={state} />
      ) : null}

      <section
        aria-labelledby="session-heading"
        className="border-foreground/10 mt-12 border-t pt-6"
      >
        <h2 id="session-heading" className="text-sm font-medium">
          Session
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {closed
            ? done
              ? "The install is complete. Finish to clear this checkout."
              : "This checkout was cancelled."
            : "Leave this tab open while your agent works. Ending the session returns its products to your cart."}
        </p>
        <div className="mt-4">
          {closed ? (
            <Button
              onClick={() => {
                if (done) finishCheckout();
                else abandonCheckout();
                router.push(done ? "/shop" : "/shop/cart");
              }}
            >
              {done ? "Finish" : "Back to cart"}
            </Button>
          ) : (
            <EndSessionButton checkout={checkout} />
          )}
        </div>
      </section>
    </div>
  );
}

export function CheckoutView() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const linkedItems = params.get("items");
  const slugs = useCart();
  const checkout = useCheckout();

  useEffect(() => {
    const linked = parseCartItems(linkedItems);
    if (linked.length > 0) replaceCart(linked);
  }, [linkedItems]);

  if (checkout !== null) return <SessionView checkout={checkout} />;
  if (!hydrated) return null;
  if (slugs.length === 0) return <EmptyState />;
  return <StartState slugs={slugs} />;
}
