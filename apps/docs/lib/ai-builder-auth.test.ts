import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", async (importOriginal) => ({
  ...(await importOriginal()),
  auth: mocks.auth,
}));

import { requireAiBuilderUser } from "./ai-builder-auth";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("requireAiBuilderUser", () => {
  it("fails closed when Clerk is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");

    const result = await requireAiBuilderUser();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(503);
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("rejects an anonymous request", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
    mocks.auth.mockResolvedValue({ userId: null });

    const result = await requireAiBuilderUser();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("returns the verified user ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
    mocks.auth.mockResolvedValue({ userId: "user_123" });

    await expect(requireAiBuilderUser()).resolves.toEqual({
      userId: "user_123",
    });
  });
});
