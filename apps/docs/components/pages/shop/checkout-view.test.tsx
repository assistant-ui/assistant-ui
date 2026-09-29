// @vitest-environment jsdom

import { useSyncExternalStore } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutView } from "./checkout-view";
import {
  currentPlan,
  initialCheckoutState,
  openInputs,
  planNeedsReview,
  stepProgress,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";
import type { CheckoutSession } from "../../../lib/checkout/session-store";

const { push, sessions } = vi.hoisted(() => {
  let session: CheckoutSession | null = null;
  const listeners = new Set<() => void>();
  return {
    push: vi.fn(),
    sessions: {
      get: () => session,
      set: (next: CheckoutSession | null) => {
        session = next;
        for (const listener of listeners) listener();
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
});

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

vi.mock("../../../lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../lib/checkout/session-store")
  >()),
  useCheckoutSession: () =>
    useSyncExternalStore(sessions.subscribe, sessions.get, () => null),
  getCheckoutSession: sessions.get,
  endCheckout: () => sessions.set(null),
}));

vi.mock("../../shared/checkout-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../shared/checkout-provider")>()),
  useCheckout: () => (sessions.get() === null ? null : checkout),
  useCheckoutFailed: () => false,
}));

Element.prototype.scrollIntoView = vi.fn();

const session: CheckoutSession = {
  id: "test",
  products: ["assistant-ui"],
  startedAt: 1,
  fromCart: true,
  licenseAccepted: true,
};

const state: Checkout.State = {
  ...initialCheckoutState(),
  id: "test",
  status: "done",
  createdAt: 1,
  agent: {
    ...initialCheckoutState().agent,
    lastSeenAt: 1,
    connected: true,
    kind: "claude-code",
  },
  steps: [{ id: "s1", title: "Install", status: "done", createdAt: 1 }],
};

const checkout: CheckoutContextValue = {
  state,
  session,
  url: "http://localhost/test",
  degraded: false,
  agentPresent: true,
  openInputs: openInputs(state),
  plan: currentPlan(state),
  planPending: planNeedsReview(state),
  progress: stepProgress(state),
  attentionKey: "",
  connection: {} as CheckoutContextValue["connection"],
  commands: {} as CheckoutContextValue["commands"],
};

afterEach(() => {
  cleanup();
  sessions.set(null);
});

describe("CheckoutView", () => {
  it("keeps the finished setup on screen after Finish while the page is being left", () => {
    sessions.set(session);
    render(<CheckoutView />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Setup complete",
    );
    fireEvent.click(
      within(screen.getByRole("contentinfo")).getByRole("button", {
        name: "Finish",
      }),
    );
    expect(sessions.get()).toBeNull();
    expect(push).toHaveBeenCalledWith("/shop");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Setup complete",
    );
    expect(screen.queryByText("Nothing here yet.")).toBeNull();
  });

  it("shows the empty cart when the session ends elsewhere", () => {
    sessions.set(session);
    render(<CheckoutView />);
    act(() => sessions.set(null));
    expect(screen.getByText("Nothing here yet.")).toBeDefined();
  });
});
