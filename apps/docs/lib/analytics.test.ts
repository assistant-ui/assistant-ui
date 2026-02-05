import assert from "node:assert/strict";
import test from "node:test";
import { analytics } from "./analytics";

test("analytics does not throw when umami exists without track", () => {
  const previousWindow = (globalThis as { window?: unknown }).window;

  (globalThis as { window?: unknown }).window = {
    umami: {},
  };

  assert.doesNotThrow(() => {
    analytics.cta.clicked("get_started", "header");
  });

  if (previousWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = previousWindow;
  }
});
