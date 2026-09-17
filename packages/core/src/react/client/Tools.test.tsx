import { describe, expect, it, vi } from "vitest";
import type { Toolkit } from "../model-context/toolbox";
import { registerToolUIs } from "./Tools";

describe("Tools cleanup", () => {
  it("attempts every tool UI cleanup when one unsubscribe throws", () => {
    const renderTool = () => null;
    const toolkit = {
      first: { render: renderTool },
      second: { render: renderTool },
    } as unknown as Toolkit;
    const cleanupError = new Error("cleanup failed");
    const cleanupOrder: number[] = [];
    let registrationCount = 0;
    const setToolUI = vi.fn(() => {
      const index = registrationCount++;
      return () => {
        cleanupOrder.push(index);
        if (index === 0) throw cleanupError;
      };
    });
    const dispose = registerToolUIs(toolkit, setToolUI);

    expect(dispose).toThrow(cleanupError);
    expect(cleanupOrder).toEqual([0, 1]);
  });
});
