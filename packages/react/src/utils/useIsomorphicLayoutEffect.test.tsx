import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

it("does not warn about useLayoutEffect during server rendering", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  function Probe() {
    useIsomorphicLayoutEffect(() => {});
    return null;
  }

  try {
    renderToString(createElement(Probe));
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(
      /useLayoutEffect does nothing on the server/,
    );
  } finally {
    errors.mockRestore();
  }
});
