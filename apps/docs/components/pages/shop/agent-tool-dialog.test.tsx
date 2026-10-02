// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCart, getCartEntries } from "../../../lib/catalog/cart-store";
import { AgentToolDialog } from "./agent-tool-dialog";

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  analytics: { shop: { cartToggled: vi.fn() } },
}));

afterEach(() => {
  cleanup();
  clearCart();
});

describe("AgentToolDialog", () => {
  it("requires an action and behavior before adding a custom tool", async () => {
    render(<AgentToolDialog />);
    fireEvent.click(
      screen.getByRole("button", { name: "Configure tool for setup" }),
    );
    expect(screen.getByRole("button", { name: "Add to setup" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(getCartEntries()).toEqual([]);
    fireEvent.click(
      screen.getByRole("combobox", { name: "What should the tool do?" }),
    );
    const option = await screen.findByRole("option", { name: "Custom tool" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    fireEvent.change(screen.getByRole("textbox", { name: "Tool name" }), {
      target: { value: "Check inventory" },
    });
    expect(screen.getByRole("button", { name: "Add to setup" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Tool behavior" }), {
      target: { value: "Read stock levels from our inventory API." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to setup" }));
    expect(getCartEntries()[0]).toMatchObject({
      name: "Check inventory",
      purpose: "Read stock levels from our inventory API.",
    });
  });

  it("reviews a preset before adding and allows repeated configured additions", () => {
    render(<AgentToolDialog presetId="web-search" />);
    for (const behavior of [
      "Search support sources.",
      "Search current news.",
    ]) {
      fireEvent.click(
        screen.getByRole("button", { name: "Add to setup: Web search" }),
      );
      fireEvent.change(screen.getByRole("textbox", { name: "Tool behavior" }), {
        target: { value: behavior },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Add to setup", hidden: true }),
      );
    }
    expect(getCartEntries()).toHaveLength(2);
    expect(getCartEntries()[0]).toMatchObject({
      name: "Web search",
      purpose: "Search support sources.",
    });
    expect(getCartEntries()[1]).toMatchObject({
      name: "Web search",
      purpose: "Search current news.",
    });
  });
});
