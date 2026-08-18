import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const mockUseAuiState = vi.fn();

type UseAuiStateSelector = Parameters<
  (typeof import("@assistant-ui/store"))["useAuiState"]
>[0];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

import { ThreadIf } from "./ThreadIf";

const setThread = (thread: {
  messages?: unknown[];
  isEmpty?: boolean;
  isRunning?: boolean;
  isDisabled?: boolean;
}) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({
      thread: {
        messages: [],
        isEmpty: false,
        isRunning: false,
        isDisabled: false,
        ...thread,
      },
    } as never),
  );
};

const frameOf = (props: Partial<Parameters<typeof ThreadIf>[0]> = {}) =>
  render(
    <ThreadIf {...props}>
      <Text>visible</Text>
    </ThreadIf>,
  ).lastFrame();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ThreadIf", () => {
  it("renders children when no filter is set", () => {
    setThread({});
    expect(frameOf()).toContain("visible");
  });

  describe.each([
    ["empty", "isEmpty"],
    ["running", "isRunning"],
    ["disabled", "isDisabled"],
  ] as const)("%s filter", (filter, stateKey) => {
    it("renders children when the filter matches the state", () => {
      setThread({ [stateKey]: true });
      expect(frameOf({ [filter]: true })).toContain("visible");

      setThread({ [stateKey]: false });
      expect(frameOf({ [filter]: false })).toContain("visible");
    });

    it("hides children when the filter contradicts the state", () => {
      setThread({ [stateKey]: false });
      expect(frameOf({ [filter]: true })).not.toContain("visible");

      setThread({ [stateKey]: true });
      expect(frameOf({ [filter]: false })).not.toContain("visible");
    });
  });

  it("follows thread.isEmpty rather than the message count", () => {
    setThread({ messages: [], isEmpty: false });

    expect(frameOf({ empty: true })).not.toContain("visible");
    expect(frameOf({ empty: false })).toContain("visible");
  });

  it("requires every supplied filter to match", () => {
    setThread({ isEmpty: true, isRunning: true });
    expect(frameOf({ empty: true, running: true })).toContain("visible");

    setThread({ isEmpty: true, isRunning: false });
    expect(frameOf({ empty: true, running: true })).not.toContain("visible");
  });
});
