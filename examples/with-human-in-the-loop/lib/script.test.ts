import { describe, expect, it } from "vitest";
import { findOrder } from "./orders";
import { nextStep, type ScriptEvent } from "./script";

const user = (text: string): ScriptEvent => ({ type: "user", text });

const lookup = (orderId: string): ScriptEvent => ({
  type: "tool",
  toolName: "find_order",
  input: { orderId },
  output: findOrder(orderId),
});

describe("nextStep", () => {
  it("looks the order up before anything else", () => {
    expect(nextStep([user("Order 1042 needs a refund.")])).toEqual({
      call: { toolName: "find_order", input: { orderId: "1042" } },
    });
  });

  it("asks for an order number when the request has none", () => {
    const step = nextStep([user("The customer wants their money back.")]);

    expect(step.call).toBeUndefined();
    expect(step.text).toMatch(/order number/);
  });

  it("asks which items to refund when the request names none", () => {
    const step = nextStep([
      user("Order 1042: refund part of it."),
      lookup("1042"),
    ]);

    expect(step.call).toEqual({
      toolName: "select_items",
      input: {
        orderId: "1042",
        items: [
          {
            id: "hp-01",
            label: "Studio headphones",
            description: "1 × $129.00",
          },
          { id: "cb-02", label: "USB-C cable", description: "2 × $12.00" },
          { id: "dm-03", label: "Desk mat", description: "1 × $38.00" },
        ],
      },
    });
  });

  it("refunds the item the request names without asking", () => {
    const step = nextStep([
      user("The desk frame on order 1063 arrived bent. Refund it."),
      lookup("1063"),
    ]);

    expect(step.call).toEqual({
      toolName: "issue_refund",
      input: { orderId: "1063", itemIds: ["df-01"], reason: "Arrived damaged" },
    });
  });

  it("refunds the items the rep picked", () => {
    const step = nextStep([
      user("Order 1042: refund part of it."),
      lookup("1042"),
      {
        type: "tool",
        toolName: "select_items",
        input: { orderId: "1042" },
        output: { selected: ["cb-02"] },
      },
    ]);

    expect(step.call).toEqual({
      toolName: "issue_refund",
      input: {
        orderId: "1042",
        itemIds: ["cb-02"],
        reason: "Customer asked for a refund",
      },
    });
  });

  it("stops after a denied refund", () => {
    const step = nextStep([
      user("Refund the desk frame on order 1063."),
      lookup("1063"),
      {
        type: "tool",
        toolName: "issue_refund",
        input: { orderId: "1063", itemIds: ["df-01"] },
        output: undefined,
        denied: true,
      },
    ]);

    expect(step.call).toBeUndefined();
    expect(step.text).toMatch(/1063 has not been refunded/);
  });

  it("keeps working on the order from an earlier turn", () => {
    const step = nextStep([
      user("Where is order 1063?"),
      lookup("1063"),
      user("Refund the cable tray."),
    ]);

    expect(step.call).toEqual({
      toolName: "find_order",
      input: { orderId: "1063" },
    });
  });

  it("answers a question about an order without refunding it", () => {
    const step = nextStep([user("Where is order 1057?"), lookup("1057")]);

    expect(step.call).toBeUndefined();
    expect(step.text).toMatch(/in transit/);
  });
});
