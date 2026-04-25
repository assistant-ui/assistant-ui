import { describe, expect, it } from "vitest";
import { message, thread, toolCall } from "../matchers/targets";

describe("matcher targets", () => {
  it("thread() returns a tagged object", () => {
    expect(thread()).toMatchObject({ __kind: "thread" });
    expect(typeof thread().on).toBe("function");
  });

  it("message(n) returns a tagged object with index", () => {
    expect(message(2)).toMatchObject({ __kind: "message", index: 2 });
    expect(typeof message(2).on).toBe("function");
  });

  it("toolCall(name) returns a tagged object with name", () => {
    expect(toolCall("get_stock_price")).toMatchObject({
      __kind: "toolCall",
      name: "get_stock_price",
    });
    expect(typeof toolCall("get_stock_price").on).toBe("function");
  });

  it("message rejects negative index at construction time", () => {
    expect(() => message(-1)).toThrow(/non-negative/i);
  });
});
