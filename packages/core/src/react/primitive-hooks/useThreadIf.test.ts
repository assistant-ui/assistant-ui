import { describe, it, expect, vi } from "vitest";

const { mockUseAuiState } = vi.hoisted(() => ({ mockUseAuiState: vi.fn() }));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: ((selector: (s: unknown) => unknown) =>
    mockUseAuiState(
      selector,
    )) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useThreadIf } from "./useThreadIf";

const against = (thread: {
  isEmpty?: boolean;
  isRunning?: boolean;
  isDisabled?: boolean;
}) =>
  mockUseAuiState.mockImplementationOnce((selector: (s: unknown) => unknown) =>
    selector({
      thread: {
        isEmpty: false,
        isRunning: false,
        isDisabled: false,
        ...thread,
      },
    }),
  );

describe("useThreadIf", () => {
  it("passes when no filter is supplied", () => {
    against({});
    expect(useThreadIf({})).toBe(true);
  });

  describe.each([
    ["empty", "isEmpty"],
    ["running", "isRunning"],
    ["disabled", "isDisabled"],
  ] as const)("%s filter", (filter, stateKey) => {
    it("passes when the filter matches the state", () => {
      against({ [stateKey]: true });
      expect(useThreadIf({ [filter]: true })).toBe(true);

      against({ [stateKey]: false });
      expect(useThreadIf({ [filter]: false })).toBe(true);
    });

    it("fails when the filter contradicts the state", () => {
      against({ [stateKey]: false });
      expect(useThreadIf({ [filter]: true })).toBe(false);

      against({ [stateKey]: true });
      expect(useThreadIf({ [filter]: false })).toBe(false);
    });

    it("ignores the filter when it is undefined", () => {
      against({ [stateKey]: true });
      expect(useThreadIf({ [filter]: undefined })).toBe(true);
    });
  });

  it("requires every supplied filter to match", () => {
    against({ isEmpty: true, isRunning: true, isDisabled: true });
    expect(useThreadIf({ empty: true, running: true, disabled: true })).toBe(
      true,
    );

    against({ isEmpty: true, isRunning: true, isDisabled: false });
    expect(useThreadIf({ empty: true, running: true, disabled: true })).toBe(
      false,
    );
  });
});
