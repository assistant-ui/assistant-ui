// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCart,
  getCart,
  getCartInstructions,
  replaceCart,
  setCartInstructions,
} from "@/lib/catalog/cart-store";
import { HarnessSetup, StatewireSetup } from "./statewire-setup";

vi.mock("@/lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/checkout/session-store")>()),
  useCheckoutSession: () => null,
}));

afterEach(() => {
  cleanup();
  clearCart();
});

describe("product setup", () => {
  it.each([
    { slug: "statewire", name: "Statewire", Setup: StatewireSetup },
    { slug: "harness-sdk", name: "harness-sdk", Setup: HarnessSetup },
  ])(
    "preserves notes when adding $name and opens the cart path",
    ({ slug, name, Setup }) => {
      replaceCart(["cloud"]);
      setCartInstructions("Keep our existing authentication.");
      render(<Setup />);
      const brief = screen.getByRole("textbox", {
        name: "What do you want to build?",
      });
      expect(brief).toHaveProperty(
        "value",
        "Keep our existing authentication.",
      );
      fireEvent.change(brief, {
        target: {
          value: "Keep our existing authentication. Build a shared whiteboard.",
        },
      });
      fireEvent.click(
        screen.getByRole("button", { name: `Add ${name} to setup` }),
      );
      expect(getCart()).toEqual(["cloud", slug]);
      expect(getCartInstructions()).toBe(
        "Keep our existing authentication. Build a shared whiteboard.",
      );
      expect(
        screen
          .getByRole("link", { name: "Continue to setup" })
          .getAttribute("href"),
      ).toBe("/components/cart");
    },
  );
});
