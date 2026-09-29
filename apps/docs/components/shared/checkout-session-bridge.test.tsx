// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CheckoutSessionBridge from "./checkout-session-bridge";
import type { CheckoutContextValue } from "./checkout-provider";
import {
  initialCheckoutState,
  type Checkout,
} from "../../lib/checkout/protocol";

const wire = vi.hoisted(() => ({
  state: undefined as Checkout.State | undefined,
  listeners: new Set<() => void>(),
  create: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("statewire", async (importOriginal) => ({
  ...(await importOriginal<typeof import("statewire")>()),
  StatewireWebsocket: vi.fn(),
  useStatewire: () => {
    const [, rerender] = useState(0);
    useEffect(() => {
      const listener = () => rerender((n) => n + 1);
      wire.listeners.add(listener);
      return () => {
        wire.listeners.delete(listener);
      };
    }, []);
    return {
      state: wire.state,
      connection: { status: "open", degraded: false, attempt: 0 },
      commands: { "checkout/create": wire.create },
    };
  },
}));

vi.mock("./use-wake-reconnect", () => ({ useWakeReconnect: () => {} }));

vi.mock("../../lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../lib/checkout/session-store")
  >()),
  agentLinkUrl: () => "https://checkout.test/link",
}));

import { useEffect, useState } from "react";

const setWire = (state: Checkout.State | undefined) => {
  act(() => {
    wire.state = state;
    for (const listener of wire.listeners) listener();
  });
};

const session = { id: "s2", products: ["assistant-ui"], startedAt: 1 };

const previous = (): Checkout.State => ({
  ...initialCheckoutState(),
  id: "s1",
  status: "done",
  createdAt: 1,
  agent: {
    lastSeenAt: Date.now(),
    connected: true,
    cwd: "/app",
    kind: "claude",
    introducedAt: 1,
  },
  products: [{ slug: "cloud", name: "Assistant Cloud" }],
});

afterEach(() => {
  cleanup();
  wire.state = undefined;
});

describe("CheckoutSessionBridge", () => {
  it("opens this session's checkout on the browser's agent link and reports only that checkout", () => {
    const onChange = vi.fn<(value: CheckoutContextValue | null) => void>();
    render(<CheckoutSessionBridge session={session} onChange={onChange} />);
    expect(wire.create).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "https://checkout.test/link",
        state: undefined,
      }),
    );

    setWire(previous());
    expect(wire.create).toHaveBeenCalledOnce();
    expect(wire.create).toHaveBeenCalledWith({
      id: "s2",
      products: [
        {
          slug: "assistant-ui",
          name: expect.any(String),
          guide: expect.stringContaining("assistant-ui"),
        },
      ],
    });
    expect(onChange.mock.lastCall?.[0]?.state).toBeUndefined();
    expect(onChange.mock.lastCall?.[0]?.agentPresent).toBe(false);

    const created: Checkout.State = {
      ...previous(),
      id: "s2",
      status: "waiting",
      products: [{ slug: "assistant-ui", name: "assistant-ui" }],
    };
    setWire(created);
    expect(wire.create).toHaveBeenCalledOnce();
    expect(onChange.mock.lastCall?.[0]?.state).toBe(created);
    expect(onChange.mock.lastCall?.[0]?.agentPresent).toBe(true);
  });

  it("does not create again when the link already carries this session's checkout", () => {
    const onChange = vi.fn();
    const current = { ...previous(), id: "s2", status: "waiting" as const };
    wire.state = current;
    render(<CheckoutSessionBridge session={session} onChange={onChange} />);
    expect(wire.create).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: current }),
    );
  });
});
