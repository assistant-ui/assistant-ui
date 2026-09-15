// @vitest-environment jsdom

import type { AssistantState } from "@assistant-ui/store";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectionState: "disconnected" as
    | "connected"
    | "connecting"
    | "authRequired"
    | "authPending"
    | "error"
    | "disconnected",
  lastError: null as { message: string } | null,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAuiState: function useAuiState<T>(selector: (state: AssistantState) => T) {
    return selector({
      mcpServer: {
        connectionState: mocks.connectionState,
        lastError: mocks.lastError,
      },
    } as AssistantState);
  },
}));

import { McpServerPrimitiveError as ErrorMessage } from "./McpServerError";
import { McpServerPrimitiveStatus as Status } from "./McpServerStatus";

afterEach(() => {
  cleanup();
  mocks.connectionState = "disconnected";
  mocks.lastError = null;
});

describe("McpServerPrimitive.Status", () => {
  it("stays silent on initial render and announces later state changes", () => {
    const view = render(<Status>Disconnected</Status>);
    const status = view.container.firstElementChild!;

    expect(status.getAttribute("role")).toBeNull();
    expect(status.textContent).toBe("Disconnected");

    mocks.connectionState = "connecting";
    view.rerender(<Status>Connecting…</Status>);

    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toBe("Connecting…");
  });

  it("preserves explicit accessibility props", () => {
    const view = render(
      <Status role="log" aria-live="assertive">
        Disconnected
      </Status>,
    );
    const status = view.container.firstElementChild!;

    expect(status.getAttribute("role")).toBe("log");
    expect(status.getAttribute("aria-live")).toBe("assertive");

    mocks.connectionState = "connected";
    view.rerender(
      <Status role="log" aria-live="assertive">
        Connected
      </Status>,
    );

    expect(status.getAttribute("role")).toBe("log");
    expect(status.getAttribute("aria-live")).toBe("assertive");
  });
});

describe("McpServerPrimitive.Error", () => {
  it("stays silent initially and announces new or changed errors", () => {
    const view = render(<ErrorMessage />);
    expect(view.container.firstElementChild).toBeNull();

    mocks.lastError = { message: "Connection failed" };
    view.rerender(<ErrorMessage />);
    const error = view.container.firstElementChild!;

    expect(error.getAttribute("role")).toBe("alert");
    expect(error.textContent).toBe("Connection failed");

    mocks.lastError = { message: "Connection timed out" };
    view.rerender(<ErrorMessage />);

    expect(error.getAttribute("role")).toBe("alert");
    expect(error.textContent).toBe("Connection timed out");
  });

  it("does not announce an error that exists on initial render", () => {
    mocks.lastError = { message: "Already failed" };
    const view = render(<ErrorMessage />);

    expect(view.container.firstElementChild!.getAttribute("role")).toBeNull();
  });

  it("preserves explicit accessibility props", () => {
    mocks.lastError = { message: "Already failed" };
    const view = render(
      <ErrorMessage role="log" aria-live="polite">
        Failure
      </ErrorMessage>,
    );
    const error = view.container.firstElementChild!;

    expect(error.getAttribute("role")).toBe("log");
    expect(error.getAttribute("aria-live")).toBe("polite");
  });
});
