// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: false,
  getWebMcpModelContext: vi.fn(),
  registerWebMcpTools: vi.fn(),
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/feature-flags")>()),
  get isWebMcpEnabled() {
    return mocks.enabled;
  },
}));

vi.mock("@/lib/webmcp-tools", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/webmcp-tools")>()),
  getWebMcpModelContext: mocks.getWebMcpModelContext,
  registerWebMcpTools: mocks.registerWebMcpTools,
}));

import { WebMcpTools } from "./webmcp-tools";

afterEach(() => {
  cleanup();
  mocks.enabled = false;
  vi.clearAllMocks();
});

describe("WebMcpTools", () => {
  it("does not detect or register tools while WebMCP is disabled", () => {
    render(<WebMcpTools />);

    expect(mocks.getWebMcpModelContext).not.toHaveBeenCalled();
    expect(mocks.registerWebMcpTools).not.toHaveBeenCalled();
  });

  it("does not register tools inside an iframe", () => {
    mocks.enabled = true;
    const self = vi
      .spyOn(window, "self", "get")
      .mockReturnValue({} as Window & typeof globalThis);
    try {
      render(<WebMcpTools />);

      expect(mocks.getWebMcpModelContext).not.toHaveBeenCalled();
      expect(mocks.registerWebMcpTools).not.toHaveBeenCalled();
    } finally {
      self.mockRestore();
    }
  });

  it("registers tools when enabled and cleans them up on unmount", () => {
    const modelContext = { registerTool: vi.fn() };
    const unregister = vi.fn();
    mocks.enabled = true;
    mocks.getWebMcpModelContext.mockReturnValue(modelContext);
    mocks.registerWebMcpTools.mockReturnValue(unregister);

    const view = render(<WebMcpTools />);

    expect(mocks.getWebMcpModelContext).toHaveBeenCalledTimes(1);
    expect(mocks.registerWebMcpTools).toHaveBeenCalledWith(
      modelContext,
      expect.any(Function),
    );

    view.unmount();
    expect(unregister).toHaveBeenCalledTimes(1);
  });
});
