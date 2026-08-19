import { describe, expect, it, vi } from "vitest";
import { createPlaygroundChatFetch } from "./playground-chat-fetch";
import {
  RATE_LIMIT_REASON_HEADER,
  RATE_LIMIT_REASONS,
} from "./rate-limit-reason";

function limited(reason: string) {
  return new Response("limited", {
    status: 429,
    headers: { [RATE_LIMIT_REASON_HEADER]: reason },
  });
}

describe("createPlaygroundChatFetch", () => {
  it("prompts after the anonymous identity allowance is exhausted", async () => {
    const onAnonymousLimit = vi.fn();
    const anonymousFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(limited(RATE_LIMIT_REASONS.identityDaily));
    const authenticatedFetch = vi.fn<typeof fetch>();
    const playgroundFetch = createPlaygroundChatFetch({
      isSignedIn: () => false,
      onAnonymousLimit,
      anonymousFetch,
      authenticatedFetch,
    });

    await playgroundFetch("/api/playground-chat");

    expect(anonymousFetch).toHaveBeenCalledOnce();
    expect(authenticatedFetch).not.toHaveBeenCalled();
    expect(onAnonymousLimit).toHaveBeenCalledOnce();
  });

  it("does not offer sign-in for hard IP or global ceilings", async () => {
    const onAnonymousLimit = vi.fn();
    const playgroundFetch = createPlaygroundChatFetch({
      isSignedIn: () => false,
      onAnonymousLimit,
      anonymousFetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(limited(RATE_LIMIT_REASONS.ipDaily)),
    });

    await playgroundFetch("/api/playground-chat");

    expect(onAnonymousLimit).not.toHaveBeenCalled();
  });

  it("uses the authenticated quota after sign-in", async () => {
    const onAnonymousLimit = vi.fn();
    const anonymousFetch = vi.fn<typeof fetch>();
    const authenticatedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(limited(RATE_LIMIT_REASONS.identityDaily));
    const playgroundFetch = createPlaygroundChatFetch({
      isSignedIn: () => true,
      onAnonymousLimit,
      anonymousFetch,
      authenticatedFetch,
    });

    await playgroundFetch("/api/playground-chat");

    expect(authenticatedFetch).toHaveBeenCalledOnce();
    expect(anonymousFetch).not.toHaveBeenCalled();
    expect(onAnonymousLimit).not.toHaveBeenCalled();
  });
});
