import { describe, expect, it, vi } from "vitest";
import { formatValue, installDiagnostics } from "./diagnostics";

describe("installDiagnostics", () => {
  it("buffers console output and still calls the original console", () => {
    const original = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onConsole = vi.fn();
    const diagnostics = installDiagnostics(window, { onConsole });
    try {
      console.warn("low", { budget: 3 });
      expect(diagnostics.console).toEqual([
        { level: "warn", message: 'low {"budget":3}' },
      ]);
      expect(onConsole).toHaveBeenCalledTimes(1);
      expect(original).toHaveBeenCalledWith("low", { budget: 3 });
    } finally {
      diagnostics.dispose();
      original.mockRestore();
    }
  });

  it("records uncaught errors, failed resources, and CSP violations", () => {
    const onError = vi.fn();
    const diagnostics = installDiagnostics(window, { onError });
    try {
      window.dispatchEvent(
        new ErrorEvent("error", {
          message: "Chart is not defined",
          filename: "blob:x",
          lineno: 4,
          colno: 9,
        }),
      );
      const img = document.createElement("img");
      img.setAttribute("src", "https://blocked.test/a.png");
      document.body.appendChild(img);
      img.dispatchEvent(new Event("error"));
      const violation = new Event("securitypolicyviolation") as Event &
        Record<string, unknown>;
      Object.assign(violation, {
        effectiveDirective: "connect-src",
        blockedURI: "https://api.test",
        lineNumber: 0,
      });
      document.dispatchEvent(violation);

      expect(diagnostics.errors).toEqual([
        {
          kind: "error",
          message: "Chart is not defined",
          source: "blob:x",
          line: 4,
          column: 9,
        },
        {
          kind: "resource",
          message: "Failed to load <img> https://blocked.test/a.png",
          source: "https://blocked.test/a.png",
        },
        {
          kind: "csp",
          message:
            "Blocked by Content Security Policy (connect-src): https://api.test",
          source: "https://api.test",
        },
      ]);
      expect(onError).toHaveBeenCalledTimes(3);
    } finally {
      diagnostics.dispose();
      document.body.replaceChildren();
    }
  });

  it("restores the console on dispose", () => {
    const before = console.info;
    installDiagnostics(window).dispose();
    expect(console.info).toBe(before);
  });
});

describe("formatValue", () => {
  it("stringifies values for the console buffer", () => {
    expect(formatValue("a")).toBe("a");
    expect(formatValue(3)).toBe("3");
    expect(formatValue([1, 2])).toBe("[1,2]");
    expect(formatValue(document.createElement("canvas"))).toBe("<canvas>");
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(formatValue(circular)).toBe("[object Object]");
  });
});
