import { Box } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "ink-testing-library";
import { ThreadListItemTitle } from "../primitives/threadListItem/ThreadListItemTitle";
import { renderFrame, type UseAuiStateSelector } from "./helpers";

const mockUseAuiState = vi.fn();

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

const mockTitle = (title: string | undefined) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ threadListItem: { title } } as never),
  );
};

afterEach(() => {
  cleanup();
});

describe("ThreadListItemTitle", () => {
  // Ink throws on a string that is not inside a Text, so a Box parent is what
  // the documented usage nests the title in.
  it("renders the title inside a Box parent", async () => {
    mockTitle("My thread");

    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle />
      </Box>,
    );

    expect(frame).toContain("My thread");
  });

  it("renders the fallback when the thread has no title", async () => {
    mockTitle(undefined);

    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle fallback="New chat" />
      </Box>,
    );

    expect(frame).toContain("New chat");
  });
});
