// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui } from "../useAui";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAui deprecation warning", () => {
  it("does not warn for the no-argument form", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Reader = () => {
      useAui();
      return null;
    };

    render(<Reader />);

    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once for the deprecated useAui({ ... }) overload", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Legacy = () => {
      useAui({});
      return null;
    };

    render(
      <>
        <Legacy />
        <Legacy />
      </>,
    );

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("useAui({ ... }) is deprecated");
    expect(warn.mock.calls[0]![0]).toContain("AuiConfig");
  });
});
