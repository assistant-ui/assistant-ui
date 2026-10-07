import { describe, expect, it } from "vitest";
import {
  DEFAULT_EFFORT_OPTIONS,
  getModelEfforts,
  resolveEffort,
  resolveModelEffort,
  type ModelOption,
} from "./model-selection";

describe("getModelEfforts", () => {
  it("uses the default levels for true", () => {
    expect(getModelEfforts({ id: "a", name: "A", efforts: true })).toBe(
      DEFAULT_EFFORT_OPTIONS,
    );
  });

  it("preserves custom levels and returns undefined without configuration", () => {
    const custom = [{ id: "max", name: "Max" }];
    expect(getModelEfforts({ id: "a", name: "A", efforts: custom })).toBe(
      custom,
    );
    expect(getModelEfforts({ id: "b", name: "B" })).toBeUndefined();
    expect(getModelEfforts(undefined)).toBeUndefined();
  });
});

describe("resolveEffort", () => {
  it("accepts supported ids and rejects unsupported or absent ones", () => {
    expect(resolveEffort(DEFAULT_EFFORT_OPTIONS, "medium")).toBe("medium");
    expect(resolveEffort(DEFAULT_EFFORT_OPTIONS, "max")).toBeUndefined();
    expect(resolveEffort(DEFAULT_EFFORT_OPTIONS, undefined)).toBeUndefined();
    expect(resolveEffort(undefined, "medium")).toBeUndefined();
  });
});

describe("resolveModelEffort", () => {
  const models: readonly ModelOption[] = [
    { id: "default", name: "Default", efforts: true },
    { id: "custom", name: "Custom", efforts: [{ id: "max", name: "Max" }] },
    { id: "plain", name: "Plain" },
  ];

  it("resolves effort against the selected model", () => {
    expect(resolveModelEffort(models, "default", "high")).toBe("high");
    expect(resolveModelEffort(models, "custom", "max")).toBe("max");
    expect(resolveModelEffort(models, "custom", "high")).toBeUndefined();
    expect(resolveModelEffort(models, "plain", "high")).toBeUndefined();
    expect(resolveModelEffort(models, "missing", "high")).toBeUndefined();
  });

  it("allows an effort to apply again after switching back", () => {
    const effort = "high";
    expect(resolveModelEffort(models, "plain", effort)).toBeUndefined();
    expect(resolveModelEffort(models, "default", effort)).toBe(effort);
  });
});
