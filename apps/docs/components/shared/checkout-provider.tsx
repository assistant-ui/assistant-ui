"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { StatewireWebsocket, useStatewire } from "statewire";
import type { Statewire, StatewireClient } from "statewire";
import { resolveProducts } from "@/lib/catalog";
import { cartUrl } from "@/lib/catalog/install-prompt";
import { notifyCheckout } from "@/lib/checkout/notifications";
import {
  checkoutUrl,
  markHandedOff,
  useCheckoutSession,
  type CheckoutSession,
} from "@/lib/checkout/session-store";
import {
  currentPlan,
  isAgentPresent,
  openInputs,
  planNeedsReview,
  stepProgress,
  type Checkout,
} from "@/lib/checkout/protocol";

export type CheckoutContextValue = {
  session: CheckoutSession;
  url: string;
  state: Checkout.State | undefined;
  connection: StatewireClient.Connection;
  /** True once a drop has outlasted the reconnect grace; brief blips stay hidden. */
  degraded: boolean;
  commands: Statewire.CommandsProxy<Checkout.Commands>;
  agentPresent: boolean;
  openInputs: Checkout.Input[];
  plan: Checkout.Plan | undefined;
  /** A proposed plan is waiting for the user's decision. */
  planPending: boolean;
  progress: { done: number; total: number };
  /** Changes whenever the checkout deserves a glance: a new question or plan, or a return to the tab with one waiting. */
  attentionKey: string;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

/** The running checkout, or `null` when none is open. */
export const useCheckout = () => useContext(CheckoutContext);

const tickListeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;
let tick = 0;
const subscribeTick = (listener: () => void) => {
  tickListeners.add(listener);
  if (ticker === null) {
    ticker = setInterval(() => {
      tick++;
      for (const entry of tickListeners) entry();
    }, 5000);
  }
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0 && ticker !== null) {
      clearInterval(ticker);
      ticker = null;
    }
  };
};
const useTick = () =>
  useSyncExternalStore(
    subscribeTick,
    () => tick,
    () => 0,
  );

const DEGRADED_GRACE_MS = 1500;

/** The transport flags a brief drop as degraded; the page only reports one that outlasts the usual reconnect. */
const useDegradedAfterGrace = (degraded: boolean) => {
  const [since, setSince] = useState<number | null>(null);
  const [, rerender] = useState(0);
  if (degraded && since === null) setSince(Date.now());
  if (!degraded && since !== null) setSince(null);
  const remaining = since === null ? 0 : since + DEGRADED_GRACE_MS - Date.now();
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => rerender((n) => n + 1), remaining);
    return () => clearTimeout(timer);
  }, [remaining]);
  return degraded && since !== null && remaining <= 0;
};

/** Notifies once per new question, plan revision and completion, skipping whatever the first snapshot already held. */
const useCheckoutNotifications = (state: Checkout.State | undefined) => {
  const seen = useRef<{ inputs: Set<string>; plans: number } | null>(null);
  useEffect(() => {
    if (state === undefined) return;
    if (seen.current === null) {
      seen.current = {
        inputs: new Set(state.inputs.map((input) => input.id)),
        plans: state.plans.length,
      };
      return;
    }
    for (const input of state.inputs) {
      if (seen.current.inputs.has(input.id)) continue;
      seen.current.inputs.add(input.id);
      if (input.status === "open") {
        notifyCheckout("Your agent has a question", input.prompt);
      }
    }
    if (state.plans.length > seen.current.plans) {
      seen.current.plans = state.plans.length;
      notifyCheckout(
        "Your agent has a plan",
        "Review it and approve, or ask for changes.",
      );
    }
  }, [state]);

  const wasDone = useRef(false);
  useEffect(() => {
    const done = state?.status === "done";
    if (done && !wasDone.current && seen.current !== null) {
      notifyCheckout("Everything is installed", "Your checkout is complete.");
    }
    wasDone.current = done;
  }, [state?.status]);
};

function CheckoutSessionProvider({
  session,
  children,
}: {
  session: CheckoutSession;
  children: ReactNode;
}) {
  const url = checkoutUrl(session.id);
  const { state, connection, commands } = useStatewire<
    Checkout.State | undefined,
    Checkout.Commands
  >({ transport: StatewireWebsocket({ url }) });
  const created = useRef(false);
  const [refocusCount, setRefocusCount] = useState(0);
  const degraded = useDegradedAfterGrace(connection.degraded);
  useTick();
  useCheckoutNotifications(state);

  useEffect(() => {
    if (state === undefined || state.createdAt !== null || created.current) {
      return;
    }
    created.current = true;
    void commands["checkout/create"]({
      products: resolveProducts(session.products).map((product) => ({
        slug: product.slug,
        name: product.name,
        guide: `${window.location.origin}${cartUrl([product.slug], { markdown: true })}`,
      })),
    });
  }, [state, session.products, commands]);

  const introduced = (state?.agent.introducedAt ?? null) !== null;
  useEffect(() => {
    if (introduced && !session.handedOff) markHandedOff();
  }, [introduced, session.handedOff]);

  const open = state ? openInputs(state) : [];
  const planPending = state ? planNeedsReview(state) : false;
  const wanted = open.length > 0 || planPending;

  useEffect(() => {
    if (!wanted) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setRefocusCount((count) => count + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [wanted]);

  const newest = open.at(-1);
  const plan = state ? currentPlan(state) : undefined;
  const attention = planPending
    ? `plan${plan?.revision}`
    : newest
      ? newest.id
      : "";
  const value: CheckoutContextValue = {
    session,
    url,
    state,
    connection,
    degraded,
    commands,
    agentPresent: state ? isAgentPresent(state) : false,
    openInputs: open,
    plan,
    planPending,
    progress: state ? stepProgress(state) : { done: 0, total: 0 },
    attentionKey: attention === "" ? "" : `${attention}:${refocusCount}`,
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const session = useCheckoutSession();
  if (session === null) return children;
  return (
    <CheckoutSessionProvider key={session.id} session={session}>
      {children}
    </CheckoutSessionProvider>
  );
}
