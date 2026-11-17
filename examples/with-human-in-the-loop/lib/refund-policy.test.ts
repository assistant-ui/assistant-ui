import { describe, expect, it } from "vitest";
import { refundApproval } from "./refund-policy";

describe("refundApproval", () => {
  it("holds a refund over the limit for a person, priced from the order", () => {
    expect(
      refundApproval({
        orderId: "1042",
        itemIds: ["hp-01"],
        reason: "Arrived damaged",
      }),
    ).toEqual({
      type: "user-approval",
      reason: "Refund $129.00 to Visa ending 4242 for Studio headphones.",
    });
  });

  it("approves a refund within the limit on its own", () => {
    expect(
      refundApproval({
        orderId: "1042",
        itemIds: ["cb-02", "dm-03"],
        reason: "Changed their mind",
      }),
    ).toEqual({
      type: "approved",
      reason: "Within the $100.00 automatic refund limit",
    });
  });

  it("counts an item once when the model repeats its id", () => {
    expect(
      refundApproval({
        orderId: "1042",
        itemIds: ["dm-03", "dm-03", "dm-03"],
        reason: "Changed their mind",
      }),
    ).toMatchObject({ type: "approved" });
  });

  it("leaves a refund it cannot price to the tool, which reports the error", () => {
    expect(
      refundApproval({ orderId: "1042", itemIds: ["nope"], reason: "Lost" }),
    ).toBe("not-applicable");
    expect(refundApproval({ orderId: "1042" })).toBe("not-applicable");
  });
});
