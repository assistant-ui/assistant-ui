import assert from "node:assert/strict";
import test from "node:test";
import { analytics } from "./analytics";

test("analytics does not throw when umami exists without track", () => {
  const globalObject = globalThis as { window?: unknown };
  const previousWindow = globalObject.window;

  try {
    globalObject.window = {
      umami: {},
    };

    assert.doesNotThrow(() => {
      analytics.cta.clicked("get_started", "header");
    });
  } finally {
    if (previousWindow === undefined) {
      delete globalObject.window;
    } else {
      globalObject.window = previousWindow;
    }
  }
});
