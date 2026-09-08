// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePartialJsonObject } from "assistant-stream/utils";
import type {
  ToolCallMessagePart,
  ToolCallMessagePartStatus,
} from "../../types/message";
import { useToolArgsStatus } from "./useToolArgsStatus";

const { state } = vi.hoisted(() => ({
  state: { part: undefined as unknown },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: (selector: (value: { part: unknown }) => unknown) =>
    selector(state),
}));

type TestArgs = {
  city: string;
  country: string;
};

type TestPart = ToolCallMessagePart<Record<string, unknown>> & {
  readonly status: ToolCallMessagePartStatus;
};

const makePart = (
  args: Record<string, unknown>,
  status: Extract<ToolCallMessagePartStatus, { type: "running" | "complete" }>,
): TestPart => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "weather",
  args,
  argsText: "",
  status,
});

afterEach(() => {
  cleanup();
  state.part = undefined;
});

describe("useToolArgsStatus", () => {
  it("reports partial object state when a field has not arrived", () => {
    const args = parsePartialJsonObject('{"city":"Par');
    if (!args) throw new Error("unable to parse partial args");
    state.part = makePart(args, { type: "running" });

    const { result } = renderHook(() => useToolArgsStatus<TestArgs>());

    expect(result.current.allPropsStatus).toBe("streaming");
    expect(result.current.propStatus.city).toBe("streaming");
    expect(result.current.propStatus.country).toBeUndefined();
  });

  it("reports complete object metadata while the tool call is running", () => {
    const args = parsePartialJsonObject('{"city":"Paris"}');
    if (!args) throw new Error("unable to parse complete args");
    state.part = makePart(args, { type: "running" });

    const { result } = renderHook(() => useToolArgsStatus<TestArgs>());

    expect(result.current.allPropsStatus).toBe("complete");
    expect(result.current.propStatus.city).toBe("complete");
  });

  it("uses the lifecycle as the fallback without parser metadata", () => {
    state.part = makePart({ city: "Paris" }, { type: "running" });
    const { result, rerender } = renderHook(() =>
      useToolArgsStatus<TestArgs>(),
    );

    expect(result.current.allPropsStatus).toBe("streaming");

    state.part = makePart(parsePartialJsonObject('{"city":"Par') ?? {}, {
      type: "complete",
    });
    rerender();

    expect(result.current.allPropsStatus).toBe("complete");
  });
});
