// @vitest-environment node

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { useTaskElapsed } from "./task";

it("does not read the clock or warn about layout effects during server rendering", () => {
  const now = vi.spyOn(Date, "now");
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  function Probe() {
    return createElement(
      "output",
      null,
      String(useTaskElapsed({ startedAt: 5_000 }, true)),
    );
  }

  try {
    expect(renderToString(createElement(Probe))).toBe(
      "<output>undefined</output>",
    );
    expect(now).not.toHaveBeenCalled();
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(
      /useLayoutEffect does nothing on the server/,
    );
  } finally {
    now.mockRestore();
    errors.mockRestore();
  }
});
