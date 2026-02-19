import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThreadListItemPrimitiveTitle } from "./ThreadListItemTitle";

const mockUseAuiState = vi.fn();

vi.mock("@assistant-ui/store", () => ({
  useAuiState: (selector: (state: unknown) => unknown) =>
    mockUseAuiState(selector),
}));

const renderTitle = (title: string | undefined, fallback = "New Chat") => {
  mockUseAuiState.mockImplementation((selector) =>
    selector({ threadListItem: { title } }),
  );

  return renderToStaticMarkup(
    <ThreadListItemPrimitiveTitle fallback={fallback} />,
  );
};

describe("ThreadListItemPrimitiveTitle", () => {
  it("renders the thread title text", () => {
    const html = renderTitle("Weather Inquiry for San Francisco");

    expect(html).toBe("Weather Inquiry for San Francisco");
  });

  it("renders fallback text when title is missing", () => {
    const html = renderTitle(undefined, "New Chat");

    expect(html).toBe("New Chat");
  });
});
