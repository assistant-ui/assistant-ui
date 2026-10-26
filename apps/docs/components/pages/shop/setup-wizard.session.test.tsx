// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SetupWizard } from "./setup-wizard";
import { initialCheckoutState } from "../../../lib/checkout/protocol";
import {
  endCheckout,
  getCheckoutSession,
  startCheckout,
} from "../../../lib/checkout/session-store";
import { clearCart, getCart } from "../../../lib/catalog/cart-store";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));
vi.mock("@vercel/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/analytics")>()),
  track: vi.fn(),
}));

Element.prototype.scrollIntoView = vi.fn();
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
});

afterEach(() => {
  cleanup();
  endCheckout();
  clearCart();
});

it.each([false, true])(
  "ends only the cancelled setup (replaced: %s)",
  async (replaced) => {
    endCheckout();
    clearCart();
    const oldSession = startCheckout(["elements/thread-list"], "", {
      fromCart: true,
    })!;
    let finishCancellation!: () => void;
    const cancellation = new Promise<void>((resolve) => {
      finishCancellation = resolve;
    });
    const cancelCommand = vi.fn(() => cancellation);
    const state = {
      ...initialCheckoutState(),
      id: oldSession.id,
      status: "planning" as const,
      createdAt: 1,
    };
    const checkout: CheckoutContextValue = {
      session: oldSession,
      state,
      url: "https://checkout.test/link",
      connection: { status: "connected", degraded: false, reconnect() {} },
      degraded: false,
      agentPresent: true,
      openInputs: [],
      plan: undefined,
      planPending: false,
      progress: { done: 0, total: 0 },
      attentionKey: "",
      commands: {
        "checkout/cancel": cancelCommand,
      } as unknown as CheckoutContextValue["commands"],
    };
    const onExit = vi.fn();
    const view = render(<SetupWizard checkout={checkout} onExit={onExit} />);
    fireEvent.click(
      within(screen.getByRole("contentinfo")).getByRole("button", {
        name: "Cancel",
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "End setup" }));
    await waitFor(() =>
      expect(cancelCommand).toHaveBeenCalledWith({ id: oldSession.id }),
    );

    const replacement = replaced
      ? (() => {
          view.unmount();
          endCheckout();
          return startCheckout(["cloud"], "Keep the replacement", {
            fromCart: true,
          });
        })()
      : null;
    if (replaced) expect(replacement).not.toBeNull();

    await act(async () => {
      finishCancellation();
      await cancellation;
    });
    expect(getCheckoutSession()).toEqual(replacement);
    expect(getCart()).toEqual(replaced ? [] : ["elements/thread-list"]);
    if (replaced) {
      expect(onExit).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    } else {
      expect(onExit).toHaveBeenCalledOnce();
      expect(push).toHaveBeenCalledWith("/components/cart");
    }
  },
);
