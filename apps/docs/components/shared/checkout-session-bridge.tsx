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
import { toast } from "sonner";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { getCatalogItem, isProductSlug, resolveProducts } from "@/lib/catalog";
import { installGuideUrl } from "@/lib/catalog/install-guide";
import {
  currentPlan,
  isAgentPresent,
  isClosed,
  openInputs,
  planNeedsReview,
  stepProgress,
  type Checkout,
} from "@/lib/checkout/protocol";
import {
  agentLinkUrl,
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

/** Holds the browser's agent link for one session and reports what it knows. The link outlives the session, so the wire may still carry the previous checkout until this session's create lands; only this session's checkout is reported. */
function CheckoutSessionBridge({
  session,
  onChange,
}: {
  session: CheckoutSession;
  onChange: (value: CheckoutContextValue | null) => void;
}) {
  const [url] = useState(agentLinkUrl);
  const wire = useStatewire<unknown, Checkout.Commands>({
    transport: StatewireWebsocket({ url }),
  });
  const { connection, commands } = wire;
  const linked = useMemo(() => parseCheckoutState(wire.state), [wire.state]);
  const state = linked?.id === session.id ? linked : undefined;
  const creating = useRef(false);
  const [refocusCount, setRefocusCount] = useState(0);
  const degraded = useDegradedAfterGrace(connection.degraded);
  const tick = useTick();

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
    if (linked === undefined || linked.id === session.id || creating.current) {
      return;
    }
    creating.current = true;
    commands["checkout/create"]({
      id: session.id,
      ...(session.instructions && { instructions: session.instructions }),
      products: products.map((product) => ({
        slug: product.slug,
        name: product.name,
        guide: `${window.location.origin}${installGuideUrl([product.slug])}`,
      })),
    }).catch(() => {
      creating.current = false;
    });
  }, [
    linked,
    connectionStatus,
    products,
    session.id,
    session.instructions,
    commands,
  ]);

  const open = useMemo(
    () =>
      state
        ? openInputs(state).filter((input) => input.kind !== "product")
        : [],
    [state],
  );
  const proposals = useMemo(
    () =>
      state && !isClosed(state)
        ? openInputs(state).filter((input) => input.kind === "product")
        : [],
    [state],
  );
  const settling = useRef(new Set<string>());
  const rejected = useRef(new Set<string>());
  const warned = useRef(new Set<string>());
  useEffect(() => {
    for (const input of proposals) {
      if (settling.current.has(input.id)) continue;
      settling.current.add(input.id);
      const product = getCatalogItem(input.product ?? "");
      // Another tab on the same session may have won the add, so only a proposal still open at the next tick was refused.
      if (rejected.current.has(input.id) && !warned.current.has(input.id)) {
        warned.current.add(input.id);
        toast.error(
          product
            ? `Could not add ${product.name} to this setup. Trying again.`
            : "Could not decline the agent's product proposal. Trying again.",
        );
      }
      const settled = product
        ? commands["checkout/add-product"]({
            inputId: input.id,
            product: {
              slug: product.slug,
              name: product.name,
              guide: `${window.location.origin}${installGuideUrl([product.slug])}`,
            },
          })
        : commands["checkout/dismiss"]({ inputId: input.id });
      settled.catch(() => {
        settling.current.delete(input.id);
        rejected.current.add(input.id);
      });
    }
  }, [proposals, commands, tick]);
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
