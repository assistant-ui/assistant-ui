// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  markPartialJsonObjectComplete,
  parsePartialJsonObject,
} from "assistant-stream/utils";

const state = vi.hoisted(() => ({
  part: {
    type: "tool-call",
    status: { type: "complete" },
    args: {} as Record<string, unknown>,
    argsText: "",
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: (value: typeof state) => unknown) =>
      selector(state),
  };
});

import { useToolArgsStatus } from "./useToolArgsStatus";

describe("useToolArgsStatus", () => {
  beforeEach(() => {
    state.part = {
      type: "tool-call",
      status: { type: "running" },
      args: {},
      argsText: "",
    };
  });

  it.each(["", "{", '{"city":"Paris",', '{"city":"Par'])(
    "reports the whole object as streaming for %j",
    (json) => {
      state.part.args = parsePartialJsonObject(json)!;
      const { result } = renderHook(() =>
        useToolArgsStatus<{ city: string; unit: string }>(),
      );
      expect(result.current.allPropsStatus).toBe("streaming");
      expect(result.current.propStatus.unit).toBeUndefined();
      expect(result.current.status).toBe("running");
    },
  );

  it.each(["{}", '{"city":"Paris"}'])(
    "reports complete arguments while the tool is still running for %j",
    (json) => {
      state.part.args = parsePartialJsonObject(json)!;
      const { result } = renderHook(() => useToolArgsStatus());
      expect(result.current.allPropsStatus).toBe("complete");
      expect(result.current.status).toBe("running");
    },
  );

  it("does not infer object completion from completed fields", () => {
    state.part.args = parsePartialJsonObject('{"city":"Paris",')!;
    const { result } = renderHook(() => useToolArgsStatus());
    expect(result.current.propStatus.city).toBe("complete");
    expect(result.current.allPropsStatus).toBe("streaming");
  });

  it.each(["complete", "incomplete", "requires-action"])(
    "settles argument streaming when the lifecycle becomes %s",
    (type) => {
      state.part.args = parsePartialJsonObject('{"city":"Par')!;
      const { result, rerender } = renderHook(() => useToolArgsStatus());
      expect(result.current.allPropsStatus).toBe("streaming");
      expect(result.current.propStatus.city).toBe("streaming");
      state.part = { ...state.part, status: { type } };
      rerender();
      expect(result.current.allPropsStatus).toBe("complete");
      expect(result.current.propStatus.city).toBe("complete");
      expect(result.current.status).toBe(type);
    },
  );

  it("does not infer completion from serialized partial snapshots", () => {
    state.part.args = { city: "Paris" };
    // ThreadMessageLike and some other adapters synthesize this text from args.
    state.part.argsText = JSON.stringify(state.part.args);
    const { result } = renderHook(() => useToolArgsStatus());
    expect(result.current.allPropsStatus).toBe("streaming");
    expect(result.current.propStatus.city).toBe("streaming");
  });

  it("updates when the parser completes the object before execution finishes", () => {
    state.part.args = parsePartialJsonObject('{"city":"Paris",')!;
    const { result, rerender } = renderHook(() => useToolArgsStatus());
    state.part = {
      ...state.part,
      args: parsePartialJsonObject('{"city":"Paris","unit":"c"}')!,
    };
    rerender();
    expect(result.current.allPropsStatus).toBe("complete");
    expect(result.current.propStatus.unit).toBe("complete");
    expect(result.current.status).toBe("running");
  });
  it("reports status for an argument named __proto__", () => {
    state.part = {
      type: "tool-call",
      status: { type: "complete" },
      args: JSON.parse('{"__proto__":"value"}'),
      argsText: '{"__proto__":"value"}',
    };
    const { result } = renderHook(() => useToolArgsStatus());

    expect(Object.hasOwn(result.current.propStatus, "__proto__")).toBe(true);
    expect(result.current.propStatus.__proto__).toBe("complete");
  });

  it("reports finalized prototype-named arguments complete while the tool runs", () => {
    state.part.args = markPartialJsonObjectComplete(
      JSON.parse('{"__proto__":{"polluted":true}}'),
    );
    const { result } = renderHook(() => useToolArgsStatus());

    expect(result.current.status).toBe("running");
    expect(result.current.allPropsStatus).toBe("complete");
    expect(Object.hasOwn(result.current.propStatus, "__proto__")).toBe(true);
    expect(result.current.propStatus.__proto__).toBe("complete");
    expect(Object.prototype).not.toHaveProperty("polluted");
  });
});
