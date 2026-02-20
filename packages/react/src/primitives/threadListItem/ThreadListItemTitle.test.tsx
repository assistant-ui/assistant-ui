import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { ThreadListItemPrimitiveTitle } from "./ThreadListItemTitle";

const mockUseAuiState = vi.fn();
type UseAuiStateSelector = Parameters<
  typeof import("@assistant-ui/store")["useAuiState"]
>[0];

vi.mock("@assistant-ui/store", () => ({
  useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
}));

const renderTitle = (
  title: string | undefined,
  fallback: ReactNode = "New Chat",
) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ threadListItem: { title } } as never),
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

  it("renders fallback text when title is an empty string", () => {
    const html = renderTitle("", "New Chat");

    expect(html).toBe("New Chat");
  });

  it("renders ReactNode fallback content", () => {
    const html = renderTitle(undefined, <em>New Chat</em>);

    expect(html).toBe("<em>New Chat</em>");
  });
});
