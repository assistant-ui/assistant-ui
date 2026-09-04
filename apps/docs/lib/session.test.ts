// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionPayload } from "@/app/api/auth/session/route";

async function sessionStateFor(
  nodeEnv: string,
  payload: SessionPayload,
): Promise<string> {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload))),
  );
  // The store caches its one fetch at module scope, so each case needs a fresh
  // copy of the module rather than a fresh render.
  vi.resetModules();
  const { useSession } = await import("./session");

  const { result } = renderHook(() => useSession());
  await waitFor(() => expect(result.current.status).not.toBe("loading"));
  return result.current.status;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const unconfigured: SessionPayload = { enabled: false, user: null };

describe("useSession", () => {
  it("keeps sign-in hidden on a deployment that carries no accounts config", async () => {
    expect(await sessionStateFor("production", unconfigured)).toBe("disabled");
  });

  it("falls back to the signed-out state on a dev server", async () => {
    expect(await sessionStateFor("development", unconfigured)).toBe(
      "anonymous",
    );
  });

  it("reports the visitor when the deployment is configured", async () => {
    const status = await sessionStateFor("production", {
      enabled: true,
      user: { name: "Ada Lovelace", email: "ada@test", image: null },
    });
    expect(status).toBe("signed-in");
  });
});
