import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { MessagePrimitiveAttachments } from "./MessageAttachments";

const mockUseAuiState = vi.fn();
type UseAuiStateSelector = (state: never) => unknown;
type AttachmentsElement = ReactElement<{ children: () => null }>;

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useMemo: (factory: () => unknown) => factory(),
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (scope: string, selector: UseAuiStateSelector) =>
      mockUseAuiState(scope, selector),
  };
});

const renderAttachmentsInner = () => {
  const element = MessagePrimitiveAttachments({
    children: () => null,
  }) as AttachmentsElement;

  const Inner = element.type as (props: typeof element.props) => unknown;
  return Inner(element.props);
};

describe("MessagePrimitiveAttachments", () => {
  it("treats missing user message attachments as empty", () => {
    mockUseAuiState.mockImplementation(
      (_scope: string, selector: UseAuiStateSelector) =>
        selector({
          role: "user",
          attachments: undefined,
        } as never),
    );

    expect(() => renderAttachmentsInner()).not.toThrow();
    expect(renderAttachmentsInner()).toEqual([]);
  });
});
