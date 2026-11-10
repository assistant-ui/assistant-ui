import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MessagePair } from "./message-pair";

const defaultProps = {
  userMessage: "What changed?",
  words: ["The", "response", "changed."],
  visibleWords: 3,
  streaming: false,
} as const;

afterEach(cleanup);

describe("MessagePair", () => {
  it("does not render unavailable actions", () => {
    render(<MessagePair {...defaultProps} />);

    expect(screen.queryByRole("button", { name: "Copy response" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Regenerate response" }),
    ).toBeNull();
  });

  it("reports copy and regenerate actions", () => {
    const onCopy = vi.fn();
    const onRegenerate = vi.fn();
    render(
      <MessagePair
        {...defaultProps}
        onCopy={onCopy}
        onRegenerate={onRegenerate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy response" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate response" }),
    );

    expect(onCopy).toHaveBeenCalledOnce();
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("hides copy and regenerate while the reply streams", () => {
    const { rerender } = render(
      <MessagePair
        {...defaultProps}
        visibleWords={2}
        streaming
        onCopy={() => {}}
        onRegenerate={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Copy response" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Regenerate response" }),
    ).toBeNull();

    rerender(
      <MessagePair
        {...defaultProps}
        onCopy={() => {}}
        onRegenerate={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Copy response" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Regenerate response" }),
    ).toBeTruthy();
  });
});
