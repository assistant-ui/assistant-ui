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
} from "@/lib/checkout/protocol";
import type { CheckoutContextValue } from "@/components/checkout-provider";
import type { CheckoutSession } from "@/lib/checkout/session-store";

const { connectAgentSetup } = vi.hoisted(() => ({
  connectAgentSetup: vi.fn(),
}));

vi.mock("@/lib/checkout/flow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/checkout/flow")>()),
  connectAgentSetup,
}));

vi.mock("./agent-link-confirm", () => ({
  AgentLinkConfirm: ({
    link,
    onConnect,
    onCancel,
  }: {
    link: string;
    onConnect: () => void;
    onCancel: () => void;
  }) => (
    <div>
      <p>Confirm {link}</p>
      <button onClick={onConnect}>Connect</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

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

vi.mock("@/lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/checkout/session-store")>()),
  useCheckoutSession: () =>
    useSyncExternalStore(sessions.subscribe, sessions.get, () => null),
  getCheckoutSession: sessions.get,
  endCheckout: () => sessions.set(null),
}));

vi.mock("@/components/checkout-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/checkout-provider")>()),
  useCheckout: () => (sessions.get() === null ? null : checkout),
  useCheckoutFailed: () => false,
}));

Element.prototype.scrollIntoView = vi.fn();

const session: CheckoutSession = {
  id: "test",
  products: ["assistant-ui"],
  startedAt: 1,
  link: "testLink1234",
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
    kind: "claude",
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
  connectAgentSetup.mockReset();
  window.history.replaceState(null, "", "/");
  sessionStorage.clear();
});

describe("CheckoutView", () => {
  it("asks before joining the setup a link opened, and joins only on Connect", () => {
    window.history.replaceState(
      null,
      "",
      "/#link=abcdEFGH1234&setup=zyxw9876ABCD",
    );
    render(<CheckoutView />);
    expect(window.location.hash).toBe("");
    expect(screen.getByText("Confirm abcdEFGH1234")).toBeTruthy();
    expect(connectAgentSetup).not.toHaveBeenCalled();
    expect(localStorage.getItem("aui-setup-session")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(connectAgentSetup).toHaveBeenCalledWith(
      "abcdEFGH1234",
      "zyxw9876ABCD",
    );
    expect(screen.queryByText("Confirm abcdEFGH1234")).toBeNull();
  });

  it("drops a link the user cancels without joining it", () => {
    window.history.replaceState(null, "", "/#link=abcdEFGH1234");
    render(<CheckoutView />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(connectAgentSetup).not.toHaveBeenCalled();
    expect(screen.queryByText("Confirm abcdEFGH1234")).toBeNull();
    expect(sessionStorage.getItem("aui-agent-link-pending")).toBeNull();
  });

  it("returns to the start once a finished setup is closed", () => {
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
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Set up assistant-ui with your coding agent",
    );
  });

  it("shows the empty state when the session ends elsewhere", () => {
    sessions.set(session);
    render(<CheckoutView />);
    act(() => sessions.set(null));
    expect(
      screen.getByRole("heading", {
        name: "Set up assistant-ui with your coding agent",
      }),
    ).toBeDefined();
  });
});
