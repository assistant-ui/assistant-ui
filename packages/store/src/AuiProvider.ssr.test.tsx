import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { AuiConfig } from "./AuiConfig";
import { AuiProvider } from "./AuiProvider";

afterEach(() => {
  vi.restoreAllMocks();
});

it("does not warn about layout effects during server rendering", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});

  renderToString(
    <AuiProvider config={AuiConfig({})}>
      <span>chat</span>
    </AuiProvider>,
  );

  expect(errors.mock.calls.flat().join(" ")).not.toMatch(
    /useLayoutEffect does nothing on the server/,
  );
});
