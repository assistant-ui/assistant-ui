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
import {
  checkoutUrl,
  useCheckoutSession,
  type CheckoutSession,
} from "@/lib/checkout/session-store";
import {
  isAgentPresent,
  openInputs,
  stepProgress,
  type Checkout,
} from "@/lib/checkout/protocol";

export type CheckoutContextValue = {
  session: CheckoutSession;
  url: string;
  state: Checkout.State | undefined;
  connection: StatewireClient.Connection;
  commands: Statewire.CommandsProxy<Checkout.Commands>;
  agentPresent: boolean;
  openInputs: Checkout.Input[];
  progress: { done: number; total: number };
  /** Changes whenever the checkout deserves a glance: a new question, or a return to the tab with one waiting. */
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
  useTick();

  useEffect(() => {
    if (state === undefined || state.createdAt !== null || created.current) {
      return;
    }
    created.current = true;
    const products = resolveProducts(session.products);
    void commands["checkout/create"]({
      products: products.map((product) => ({
        slug: product.slug,
        name: product.name,
        guide: cartUrl([product.slug], { markdown: true, absolute: true }),
        steps: product.checkout.steps,
      })),
      inputs: products.flatMap((product) => product.checkout.questions ?? []),
    });
  }, [state, session.products, commands]);

  const open = state ? openInputs(state) : [];

  useEffect(() => {
    if (open.length === 0) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setRefocusCount((count) => count + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [open.length]);

  const newest = open.at(-1);
  const value: CheckoutContextValue = {
    session,
    url,
    state,
    connection,
    commands,
    agentPresent: state ? isAgentPresent(state) : false,
    openInputs: open,
    progress: state ? stepProgress(state) : { done: 0, total: 0 },
    attentionKey: newest ? `${newest.id}:${refocusCount}` : "",
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
