import { Box } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "ink-testing-library";
import { Title as ThreadListItemTitle } from "../primitives/threadListItem";
import { renderFrame, type UseAuiStateSelector } from "./helpers";

const { mockUseAuiState, captured } = vi.hoisted(() => ({
  mockUseAuiState: vi.fn(),
  captured: { textProps: null as Record<string, unknown> | null },
}));

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  const React = await import("react");
  const TextMock = (props: Record<string, unknown>) => {
    captured.textProps = props;
    return React.createElement(
      actual.Text as unknown as React.ElementType,
      props,
    );
  };
  return { ...actual, Text: TextMock };
});

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
  it("renders the title inside a Box parent", async () => {
    mockTitle("My thread");

    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle />
      </Box>,
    );

    expect(frame).toContain("My thread");
  });

  it("forwards host Text props the public type exposes", async () => {
    mockTitle("My thread");

    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle dimColor wrap="truncate" />
      </Box>,
    );

    expect(captured.textProps).toMatchObject({
      dimColor: true,
      wrap: "truncate",
    });
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
