// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutView } from "./checkout-view";
import { initialCheckoutState } from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

const { useCheckout, useRouter, useCheckoutSession } = vi.hoisted(() => ({
  useCheckout: vi.fn(),
  useRouter: vi.fn(),
  useCheckoutSession: vi.fn(),
}));

vi.mock("../../shared/checkout-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../shared/checkout-provider")>()),
  useCheckout,
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter,
}));
vi.mock("../../../lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../lib/checkout/session-store")
  >()),
  useCheckoutSession,
}));

let desktop: MediaQueryList;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const queries = new Map<string, MediaQueryList>();
  vi.stubGlobal("matchMedia", (query: string) => {
    let media = queries.get(query);
    if (!media) {
      media = Object.assign(new EventTarget(), {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      });
      queries.set(query, media);
    }
    return media;
  });
  desktop = window.matchMedia("(min-width: 1024px)");
  const checkout: CheckoutContextValue = {
    state: { ...initialCheckoutState(), createdAt: 1 },
    session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
    url: "http://localhost/test",
    connection: {} as CheckoutContextValue["connection"],
    commands: {} as CheckoutContextValue["commands"],
    degraded: false,
    agentPresent: false,
    openInputs: [],
    plan: undefined,
    planPending: false,
    progress: { done: 0, total: 0 },
    attentionKey: "",
  };
  useCheckout.mockReturnValue(checkout);
  useCheckoutSession.mockReturnValue(checkout.session);
  useRouter.mockReturnValue({ push: vi.fn(), replace: vi.fn(), back: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("setup header", () => {
  it("keeps reconnect instructions available in the desktop sidebar", () => {
    const checkout =
      useCheckout.getMockImplementation()!() as CheckoutContextValue;
    useCheckout.mockReturnValue({
      ...checkout,
      state: {
        ...checkout.state!,
        status: "planning",
        agent: { ...checkout.state!.agent, lastSeenAt: 1 },
      },
    });
    render(<CheckoutView />);
    expect(screen.getByText(/disconnected\./)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Show the prompt" }));
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeDefined();
  });

  it("links to documentation without navigating away from setup", () => {
    render(<CheckoutView />);
    const docs = screen.getByRole("link", { name: /Docs.*opens in a new tab/ });
    expect(docs.getAttribute("href")).toBe("/docs");
    expect(docs.getAttribute("target")).toBe("_blank");
    expect(docs.getAttribute("rel")).toContain("noopener");
    expect(
      screen.getByRole("heading", { name: "Set up in your own project" }),
    ).toBeDefined();
  });

  it("closes mobile details when the desktop sidebar becomes available", async () => {
    const removeListener = vi.spyOn(desktop, "removeEventListener");
    render(<CheckoutView />);
    fireEvent.click(screen.getByRole("button", { name: "Setup details" }));
    expect(
      await screen.findByRole("dialog", { name: "Your setup" }),
    ).toBeDefined();
    act(() => {
      Object.assign(desktop, { matches: true });
      desktop.dispatchEvent(new Event("change"));
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Your setup" })).toBeNull(),
    );
    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(
      screen.getByRole("link", { name: /Docs.*opens in a new tab/ }),
    ).toBeDefined();
    act(() => {
      Object.assign(desktop, { matches: false });
      desktop.dispatchEvent(new Event("change"));
    });
    expect(screen.queryByRole("dialog", { name: "Your setup" })).toBeNull();
  });
});
