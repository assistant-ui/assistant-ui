// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductInputCard } from "./product-input-card";
import { WizardHost } from "./test/wizard-host";
import type { Checkout } from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

afterEach(cleanup);

const input = (product: string): Checkout.Input => ({
  id: "q1",
  kind: "product",
  product,
  prompt: "assistant-ui is not installed yet. Add it to this setup?",
  phase: "planning",
  optional: false,
  status: "open",
  createdAt: 1,
});

const setup = (product: string) => {
  const commands = {
    "checkout/add-product": vi.fn().mockResolvedValue(undefined),
    "checkout/dismiss": vi.fn().mockResolvedValue(undefined),
  };
  render(
    <WizardHost>
      <ProductInputCard
        input={input(product)}
        checkout={{ commands } as unknown as CheckoutContextValue}
      />
    </WizardHost>,
  );
  return commands;
};

describe("ProductInputCard", () => {
  it("adds the proposed product with its guide", async () => {
    const commands = setup("assistant-ui");
    expect(screen.getByText("assistant-ui")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(commands["checkout/add-product"]).toHaveBeenCalledWith({
        inputId: "q1",
        product: {
          slug: "assistant-ui",
          name: "assistant-ui",
          guide: `${window.location.origin}/shop/cart.md?items=assistant-ui`,
        },
      }),
    );
  });

  it("declines by dismissing, even when the input is required", async () => {
    const commands = setup("assistant-ui");
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    await waitFor(() =>
      expect(commands["checkout/dismiss"]).toHaveBeenCalledWith({
        inputId: "q1",
      }),
    );
    expect(commands["checkout/add-product"]).not.toHaveBeenCalled();
  });

  it("disables Add and offers Dismiss for a product the shop does not carry", () => {
    setup("nope");
    expect(screen.getByRole("button", { name: "Add" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeDefined();
  });
});
