import { describe, expect, it } from "vitest";
import { raceWithAbortSignal } from "./raceWithAbortSignal";

describe("raceWithAbortSignal", () => {
  it("invokes the operation synchronously without a signal", async () => {
    const order: string[] = [];

    const result = raceWithAbortSignal(undefined, () => {
      order.push("operation");
      return "done";
    });
    order.push("after");

    expect(order).toEqual(["operation", "after"]);
    await expect(result).resolves.toBe("done");
  });

  it("converts a synchronous operation error to a rejection", async () => {
    const error = new Error("failed");

    const result = raceWithAbortSignal(undefined, () => {
      throw error;
    });

    await expect(result).rejects.toBe(error);
  });
});
