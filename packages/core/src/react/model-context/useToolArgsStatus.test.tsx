// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const part = vi.hoisted(() => ({
  type: "tool-call" as const,
  status: { type: "complete" as const },
  args: JSON.parse('{"__proto__":"value"}') as Record<string, unknown>,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: (state: { part: typeof part }) => unknown) =>
      selector({ part }),
  };
});

import { useToolArgsStatus } from "./useToolArgsStatus";

describe("useToolArgsStatus", () => {
  it("reports status for an argument named __proto__", () => {
    const { result } = renderHook(() => useToolArgsStatus());

    expect(Object.hasOwn(result.current.propStatus, "__proto__")).toBe(true);
    expect(result.current.propStatus.__proto__).toBe("complete");
  });
});
