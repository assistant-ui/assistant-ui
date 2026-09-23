// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { initialCheckoutState } from "@/lib/checkout/protocol";
import { AgentChat } from "./agent-chat";

afterEach(cleanup);

const checkout = (): CheckoutContextValue => ({
  state: initialCheckoutState(),
  session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
  url: "https://checkout.example.test/session",
  degraded: false,
  agentPresent: false,
  openInputs: [],
  plan: undefined,
  planPending: false,
  progress: { done: 0, total: 0 },
  attentionKey: "",
  connection: {} as CheckoutContextValue["connection"],
  commands: {} as CheckoutContextValue["commands"],
});

describe("AgentChat", () => {
  it("resizes the sheet from its left edge with the keyboard", async () => {
    window.innerWidth = 1000;
    render(<AgentChat checkout={checkout()} open onOpenChange={vi.fn()} />);
    const handle = await screen.findByRole("separator", {
      name: "Resize messages",
    });
    const sheet = handle.parentElement!;
    expect(handle.getAttribute("aria-valuenow")).toBe("384");
    expect(handle.getAttribute("aria-valuemin")).toBe("320");
    expect(handle.getAttribute("aria-valuemax")).toBe("936");
    expect(sheet.style.width).toBe("");
    expect(sheet.className).not.toContain("max-w-none");
    await act(async () => {
      fireEvent.keyDown(handle, { key: "ArrowLeft" });
    });
    expect(handle.getAttribute("aria-valuenow")).toBe("408");
    expect(sheet.style.width).toBe("408px");
    expect(sheet.className).toContain("data-[side=right]:sm:max-w-none");
    expect(sheet.className).not.toContain("data-[side=right]:sm:max-w-sm");
  });
});
