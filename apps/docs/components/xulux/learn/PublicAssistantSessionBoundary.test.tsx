import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  effect: undefined as undefined | (() => void | (() => void)),
  ensureAnonymousSession: vi.fn<() => Promise<void>>(),
  sessionState: "loading" as "loading" | "ready" | "error",
  setAttempt: vi.fn(),
  setSessionState: vi.fn(),
}));

vi.mock("@/lib/anonymous-session-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anonymous-session-client")>()),
  ensureAnonymousSession: mocks.ensureAnonymousSession,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: ((effect: () => void | (() => void)) => {
    mocks.effect = effect;
  }) as typeof import("react").useEffect,
  useState: ((initial: unknown) =>
    initial === "loading"
      ? [mocks.sessionState, mocks.setSessionState]
      : [0, mocks.setAttempt]) as typeof import("react").useState,
}));

import { PublicAssistantSessionBoundary } from "./PublicAssistantSessionBoundary";

afterEach(() => {
  mocks.effect = undefined;
  mocks.sessionState = "loading";
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
    const runtime = <div>Preview runtime</div>;
    const loading = PublicAssistantSessionBoundary({ children: runtime });

    expect(loading).not.toBe(runtime);
    expect(mocks.effect).toBeTypeOf("function");

    mocks.effect?.();
    expect(mocks.ensureAnonymousSession).toHaveBeenCalledTimes(1);
    expect(mocks.setSessionState).not.toHaveBeenCalled();

    resolveSession();
    await Promise.resolve();

    expect(mocks.setSessionState).toHaveBeenCalledWith("ready");

    mocks.sessionState = "ready";
    expect(PublicAssistantSessionBoundary({ children: runtime })).toBe(runtime);
  });
});
