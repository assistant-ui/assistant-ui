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

  it("explains missing Clerk configuration in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("CLERK_SECRET_KEY", "");

    const result = (await requireAiBuilderUser()) as Response;

    await expect(result.json()).resolves.toEqual({
      error:
        "AI Builder authentication is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.",
    });
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

  it("fails closed and logs when Clerk session verification throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
    const error = new Error("Clerk middleware context missing");
    mocks.auth.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await requireAiBuilderUser();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(503);
    expect(consoleError).toHaveBeenCalledWith(
      "[ai-builder-auth] Failed to verify the user session",
      error,
    );
  });
});
