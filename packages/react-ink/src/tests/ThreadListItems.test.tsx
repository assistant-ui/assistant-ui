import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "ink-testing-library";
import type { ReactNode } from "react";
import { Text } from "ink";
import { renderFrame, type UseAuiStateSelector } from "./helpers";

const capturedProviderProps = vi.fn();
const mockUseAuiState = vi.fn();

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    ThreadListItemByIndexProvider: ({
      index,
      archived,
      children,
    }: {
      index: number;
      archived: boolean;
      children?: ReactNode;
    }) => {
      capturedProviderProps({ index, archived });
      return <>{children}</>;
    },
  };
});

const { ThreadListPrimitive } = await import("../index");

const mockThreadIds = (threadIds: string[]) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ threads: { threadIds } } as never),
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ThreadListPrimitive.Items", () => {
  it("renders rows without a missing-key warning", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockThreadIds(["t-1", "t-2"]);

    await renderFrame(
      <ThreadListPrimitive.Items
        renderItem={({ threadId }) => <Text>{threadId}</Text>}
      />,
    );

    const keyWarnings = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes('unique "key" prop'),
    );
    expect(keyWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });

  it("wraps each row in ThreadListItemByIndexProvider with its index", async () => {
    mockThreadIds(["t-1", "t-2", "t-3"]);

    const frame = await renderFrame(
      <ThreadListPrimitive.Items
        renderItem={({ threadId }) => <Text>{threadId}</Text>}
      />,
    );

    expect(capturedProviderProps.mock.calls.map((call) => call[0])).toEqual([
      { index: 0, archived: false },
      { index: 1, archived: false },
      { index: 2, archived: false },
    ]);
    expect(frame).toContain("t-1");
    expect(frame).toContain("t-3");
  });

  it("passes threadId and index to renderItem", async () => {
    const renderItem = vi.fn(
      ({ threadId }: { threadId: string; index: number }) => (
        <Text>{threadId}</Text>
      ),
    );
    mockThreadIds(["a", "b"]);

    await renderFrame(<ThreadListPrimitive.Items renderItem={renderItem} />);

    expect(renderItem.mock.calls.map((call) => call[0])).toEqual([
      { threadId: "a", index: 0 },
      { threadId: "b", index: 1 },
    ]);
  });
});
