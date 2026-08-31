// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAnonymousSession: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/lib/anonymous-session-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anonymous-session-client")>()),
  ensureAnonymousSession: mocks.ensureAnonymousSession,
}));

import { PublicAssistantSessionBoundary } from "./PublicAssistantSessionBoundary";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PublicAssistantSessionBoundary", () => {
  it("waits for the anonymous session before mounting the preview runtime", async () => {
    let resolveSession!: () => void;
    mocks.ensureAnonymousSession.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSession = resolve;
      }),
    );

    render(
      <PublicAssistantSessionBoundary>
        <div>Preview runtime</div>
      </PublicAssistantSessionBoundary>,
    );

    expect(mocks.ensureAnonymousSession).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Preview runtime")).toBeNull();

    await act(async () => {
      resolveSession();
    });

    expect(screen.getByText("Preview runtime")).toBeTruthy();
  });

  it("shows session failures and retries before mounting the runtime", async () => {
    mocks.ensureAnonymousSession
      .mockRejectedValueOnce(new Error("session unavailable"))
      .mockResolvedValueOnce();

    render(
      <PublicAssistantSessionBoundary>
        <div>Preview runtime</div>
      </PublicAssistantSessionBoundary>,
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Preview runtime")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.ensureAnonymousSession).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Preview runtime")).toBeTruthy();
  });
});
