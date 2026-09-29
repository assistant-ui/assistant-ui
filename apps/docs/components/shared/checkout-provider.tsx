"use client";

import {
  Component,
  Suspense,
  createContext,
  lazy,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Statewire, StatewireClient } from "statewire";
import {
  useCheckoutSession,
  type CheckoutSession,
} from "@/lib/checkout/session-store";
import type { Checkout } from "@/lib/checkout/protocol";

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

type CheckoutContextShape = {
  checkout: CheckoutContextValue | null;
  failed: boolean;
};

const CheckoutContext = createContext<CheckoutContextShape>({
  checkout: null,
  failed: false,
});

/** The connected checkout, or `null` when no session is open or its connection is still loading. */
export const useCheckout = () => useContext(CheckoutContext).checkout;

/** True when the open session cannot be read, which leaves ending it as the only way on. */
export const useCheckoutFailed = () => useContext(CheckoutContext).failed;

const CheckoutSessionBridge = lazy(
  () => import("@/components/shared/checkout-session-bridge"),
);

class BridgeBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The bridge mounts beside `children`, never around them, so a session starting or ending leaves the page tree in place. */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const session = useCheckoutSession();
  const [connected, setConnected] = useState<CheckoutContextValue | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  const failed = session !== null && failedId === session.id;
  const checkout =
    session !== null && !failed && connected?.session.id === session.id
      ? connected
      : null;
  const shape = useMemo(() => ({ checkout, failed }), [checkout, failed]);

  return (
    <CheckoutContext.Provider value={shape}>
      {children}
      {session !== null ? (
        <BridgeBoundary
          key={session.id}
          onError={() => setFailedId(session.id)}
        >
          <Suspense fallback={null}>
            <CheckoutSessionBridge session={session} onChange={setConnected} />
          </Suspense>
        </BridgeBoundary>
      ) : null}
    </CheckoutContext.Provider>
  );
}
