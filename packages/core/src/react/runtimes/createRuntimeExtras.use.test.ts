import { describe, it, expect, vi } from "vitest";

const { mockUseAuiState } = vi.hoisted(() => ({ mockUseAuiState: vi.fn() }));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: ((selector: (s: unknown) => unknown) =>
    mockUseAuiState(
      selector,
    )) as typeof import("@assistant-ui/store").useAuiState,
}));

import { createRuntimeExtras } from "./createRuntimeExtras";

type Extras = { value: number };

const against = (extras: unknown) =>
  mockUseAuiState.mockImplementationOnce((selector: (s: unknown) => unknown) =>
    selector({ thread: { extras } }),
  );

describe("createRuntimeExtras.use", () => {
  const channel = createRuntimeExtras<Extras>("useTestRuntime");

  it("projects the extras when the thread is backed by the runtime", () => {
    against(channel.provide({ value: 5 }));
    expect(channel.use((e) => e.value, 0)).toBe(5);
  });

  it("returns the whole extras when called without a selector", () => {
    const extras = channel.provide({ value: 9 });
    against(extras);
    expect(channel.use()).toBe(extras);
  });

  it("returns the fallback when the thread is not backed by the runtime", () => {
    against(undefined);
    expect(channel.use((e) => e.value, 0)).toBe(0);
  });

  it("returns an explicit undefined fallback instead of throwing", () => {
    against(undefined);
    expect(channel.use((e) => e.value, undefined)).toBeUndefined();
  });

  it("throws when no fallback is given and the runtime is absent", () => {
    against(undefined);
    expect(() => channel.use((e) => e.value)).toThrow("useTestRuntime");
  });
});
