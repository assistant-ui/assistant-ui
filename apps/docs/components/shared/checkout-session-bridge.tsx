"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { StatewireWebsocket, useStatewire } from "statewire";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { isProductSlug, resolveProducts } from "@/lib/catalog";
import { cartUrl } from "@/lib/catalog/install-prompt";
import { notifyCheckout } from "@/lib/checkout/notifications";
import {
  currentPlan,
  isAgentPresent,
  openInputs,
  planNeedsReview,
  stepProgress,
  type Checkout,
} from "@/lib/checkout/protocol";
import {
  checkoutUrl,
  type CheckoutSession,
  addCheckoutProducts,
  endCheckout,
} from "@/lib/checkout/session-store";
import { parseCheckoutState } from "@/lib/checkout/wire-state";
import { useWakeReconnect } from "@/components/shared/use-wake-reconnect";

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

  const proposedAt = state?.completion?.proposedAt;
  const loaded = state !== undefined;
  const previousProposedAt = useRef<{ at: number | undefined }>(undefined);
  useEffect(() => {
    if (!loaded) return;
    if (
      proposedAt !== undefined &&
      previousProposedAt.current !== undefined &&
      previousProposedAt.current.at !== proposedAt
    ) {
      notifyCheckout(
        "Your agent finished",
        "Close the setup, or send a message to keep going.",
      );
    }
    previousProposedAt.current = { at: proposedAt };
  }, [loaded, proposedAt]);
};

/** Holds the connection for one session and reports what it knows. */
function CheckoutSessionBridge({
  session,
  onChange,
}: {
  session: CheckoutSession;
  onChange: (value: CheckoutContextValue | null) => void;
}) {
  const url = checkoutUrl(session.id);
  const wire = useStatewire<unknown, Checkout.Commands>({
    transport: StatewireWebsocket({ url }),
  });
  const { connection, commands } = wire;
  const state = useMemo(() => parseCheckoutState(wire.state), [wire.state]);
  const creating = useRef(false);
  const [refocusCount, setRefocusCount] = useState(0);
  const degraded = useDegradedAfterGrace(connection.degraded);
  useTick();
  useCheckoutNotifications(state);

  const products = useMemo(
    () => resolveProducts(session.products),
    [session.products],
  );
  useEffect(() => {
    if (products.length === 0) endCheckout();
  }, [products]);

  const joined = state?.products.map((product) => product.slug).join(",");
  useEffect(() => {
    if (joined) addCheckoutProducts(joined.split(",").filter(isProductSlug));
  }, [joined]);

  const connectionStatus = connection.status;
  useEffect(() => {
    if (state === undefined || state.createdAt !== null || creating.current) {
      return;
    }
    creating.current = true;
    commands["checkout/create"]({
      ...(session.instructions && { instructions: session.instructions }),
      products: products.map((product) => ({
        slug: product.slug,
        name: product.name,
        guide: `${window.location.origin}${cartUrl([product.slug], { markdown: true })}`,
      })),
    }).catch(() => {
      creating.current = false;
    });
  }, [state, connectionStatus, products, session.instructions, commands]);

  const open = useMemo(() => (state ? openInputs(state) : []), [state]);
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

  useWakeReconnect(connection);

  const agentPresent = state ? isAgentPresent(state) : false;
  const value = useMemo<CheckoutContextValue>(() => {
    const plan = state ? currentPlan(state) : undefined;
    const newest = open.at(-1);
    const attention = planPending
      ? `plan${plan?.revision}`
      : newest
        ? newest.id
        : "";
    return {
      session,
      url,
      state,
      connection,
      degraded,
      commands,
      agentPresent,
      openInputs: open,
      plan,
      planPending,
      progress: state ? stepProgress(state) : { done: 0, total: 0 },
      attentionKey: attention === "" ? "" : `${attention}:${refocusCount}`,
    };
  }, [
    session,
    url,
    state,
    connection,
    degraded,
    commands,
    agentPresent,
    open,
    planPending,
    refocusCount,
  ]);

  useEffect(() => {
    onChange(value);
  }, [onChange, value]);
  useEffect(() => () => onChange(null), [onChange]);

  return null;
}

export default memo(CheckoutSessionBridge);
