import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

afterEach(() => {
  vi.restoreAllMocks();
});

it("does not warn about layout effects during server rendering", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const Probe = () => {
    useIsomorphicLayoutEffect(() => {}, []);
    return null;
  };

  renderToString(<Probe />);

  expect(errors.mock.calls.flat().join(" ")).not.toMatch(
    /useLayoutEffect does nothing on the server/,
  );
});
