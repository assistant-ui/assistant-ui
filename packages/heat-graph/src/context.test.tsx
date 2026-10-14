import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTooltipDispatch, useTooltipState } from "./context";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tooltip context hooks", () => {
  it.each([
    ["useTooltipState", useTooltipState],
    ["useTooltipDispatch", useTooltipDispatch],
  ] as const)("%s throws outside HeatGraph.Root", (name, hook) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => hook())).toThrow(
      `${name} must be used within a HeatGraph.Root`,
    );
  });
});
