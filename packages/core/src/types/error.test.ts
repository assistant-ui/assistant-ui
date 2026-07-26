import { describe, it, expect } from "vitest";
import {
  toAssistantError,
  isAssistantError,
  type AssistantError,
} from "./error";

describe("toAssistantError", () => {
  it("converts an Error instance", () => {
    expect(toAssistantError(new Error("boom"))).toEqual({
      code: "unknown",
      message: "boom",
    });
  });

  it("converts a string", () => {
    expect(toAssistantError("plain failure")).toEqual({
      code: "unknown",
      message: "plain failure",
    });
  });

  it("converts a plain object", () => {
    const value = { foo: 1 };
    expect(toAssistantError(value)).toEqual({
      code: "unknown",
      message: `[object] ${String(value)}`,
    });
  });

  it("converts a thrown Symbol", () => {
    const value = Symbol("x");
    expect(toAssistantError(value)).toEqual({
      code: "unknown",
      message: `[symbol] ${String(value)}`,
    });
  });

  it("converts a thrown number", () => {
    expect(toAssistantError(42)).toEqual({
      code: "unknown",
      message: "[number] 42",
    });
  });

  it("converts a thrown null", () => {
    expect(toAssistantError(null)).toEqual({
      code: "unknown",
      message: "[object] null",
    });
  });

  it("converts an object whose toString throws", () => {
    const value = {
      toString() {
        throw new Error("toString failed");
      },
    };
    expect(toAssistantError(value)).toEqual({
      code: "unknown",
      message: "[object]",
    });
  });

  it("passes an AssistantError through unchanged", () => {
    const error: AssistantError = {
      code: "network",
      message: "offline",
      severity: "warning",
      display: "toast",
    };
    expect(toAssistantError(error)).toBe(error);
  });
});

describe("isAssistantError", () => {
  it("accepts a minimal valid value", () => {
    expect(isAssistantError({ code: "unknown", message: "x" })).toBe(true);
  });

  it("accepts optional severity and display literals", () => {
    expect(
      isAssistantError({
        code: "provider",
        message: "rate limited",
        severity: "info",
        display: "silent",
      }),
    ).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isAssistantError("fail")).toBe(false);
    expect(isAssistantError(null)).toBe(false);
    expect(isAssistantError(undefined)).toBe(false);
  });

  it("rejects missing code or message", () => {
    expect(isAssistantError({ code: "unknown" })).toBe(false);
    expect(isAssistantError({ message: "x" })).toBe(false);
  });

  it("rejects a bad severity literal", () => {
    expect(
      isAssistantError({
        code: "unknown",
        message: "x",
        severity: "fatal",
      }),
    ).toBe(false);
  });

  it("rejects a bad display literal", () => {
    expect(
      isAssistantError({
        code: "unknown",
        message: "x",
        display: "modal",
      }),
    ).toBe(false);
  });
});
