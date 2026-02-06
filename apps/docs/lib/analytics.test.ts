import { expect, it } from "vitest";
import { analytics } from "./analytics";

it("analytics does not throw when umami exists without track", () => {
  const globalObject = globalThis as { window?: unknown };
  const previousWindow = globalObject.window;

  try {
    globalObject.window = {
      umami: {},
    };

    expect(() => {
      analytics.cta.clicked("get_started", "header");
    }).not.toThrow();
  } finally {
    if (previousWindow === undefined) {
      delete globalObject.window;
    } else {
      globalObject.window = previousWindow;
    }
  }
});
