import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stateDelta: {} as Record<string, unknown>,
  runtimeExtras: {
    authRequests: [] as Array<{ toolCallId: string; authConfig: unknown }>,
    send: vi.fn(),
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({}),
}));

vi.mock("./adkExtras", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adkExtras")>()),
  adkExtras: {
    use: (
      selector: (extras: { stateDelta: Record<string, unknown> }) => unknown,
    ) => selector({ stateDelta: mocks.stateDelta }),
    get: () => mocks.runtimeExtras,
  },
}));

import { useAdkAppState, useAdkSubmitAuth } from "./hooks";

describe("ADK state hooks", () => {
  it("preserves a prototype-named state key", () => {
    mocks.stateDelta = Object.fromEntries([
      ["app:__proto__", { source: "provider" }],
      ["app:visible", true],
    ]);

    const { result } = renderHook(() => useAdkAppState());

    expect(Object.getPrototypeOf(result.current)).toBe(Object.prototype);
    expect(Object.hasOwn(result.current, "__proto__")).toBe(true);
    expect(result.current["__proto__"]).toEqual({ source: "provider" });
    expect(result.current.visible).toBe(true);
  });
});

describe("useAdkSubmitAuth", () => {
  it("preserves the pending request config and wraps the credential", () => {
    const credential = { authType: "apiKey" as const, apiKey: "secret" };
    mocks.runtimeExtras.authRequests = [
      {
        toolCallId: "synthetic",
        authConfig: { authScheme: { type: "apiKey" }, credentialKey: "key" },
      },
    ];

    const { result } = renderHook(() => useAdkSubmitAuth());
    result.current("synthetic", credential);

    expect(mocks.runtimeExtras.send).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          type: "tool",
          tool_call_id: "synthetic",
          name: "adk_request_credential",
          content: JSON.stringify({
            authScheme: { type: "apiKey" },
            credentialKey: "key",
            exchangedAuthCredential: credential,
          }),
          status: "success",
        }),
      ],
      {},
    );
  });

  it("does not submit a response for an unknown request id", () => {
    mocks.runtimeExtras.authRequests = [];

    const { result } = renderHook(() => useAdkSubmitAuth());
    result.current("unknown", { authType: "apiKey", apiKey: "secret" });

    expect(mocks.runtimeExtras.send).not.toHaveBeenCalled();
  });
});
