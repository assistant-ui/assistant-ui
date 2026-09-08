// @vitest-environment jsdom

import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextMessagePartProvider } from "../../context/providers/TextMessagePartProvider";
import { MessagePartPrimitiveText } from "./MessagePartText";

describe("MessagePartPrimitive.Text", () => {
  it("renders text in the supplied element and composes its props and refs", () => {
    const ref = createRef<HTMLSpanElement>();
    const targetRef = createRef<HTMLElement>();
    const { rerender } = render(
      <TextMessagePartProvider text="Hello">
        <MessagePartPrimitiveText
          smooth={false}
          render={<mark ref={targetRef} className="target" />}
          className="text"
          ref={ref}
        />
      </TextMessagePartProvider>,
    );

    const text = screen.getByText("Hello");
    expect(text.tagName).toBe("MARK");
    expect(text.classList.contains("target")).toBe(true);
    expect(text.classList.contains("text")).toBe(true);
    expect(text.getAttribute("data-status")).toBe("complete");
    expect(text.hasAttribute("render")).toBe(false);
    expect(ref.current).toBe(text);
    expect(targetRef.current).toBe(text);

    rerender(
      <TextMessagePartProvider text="Hello again" isRunning>
        <MessagePartPrimitiveText smooth={false} render={<mark />} />
      </TextMessagePartProvider>,
    );

    const updated = screen.getByText("Hello again");
    expect(updated.tagName).toBe("MARK");
    expect(updated.getAttribute("data-status")).toBe("running");
  });

  it("keeps the default span and explicit component behavior", () => {
    render(
      <TextMessagePartProvider text="Hello">
        <MessagePartPrimitiveText />
        <MessagePartPrimitiveText component="p" />
      </TextMessagePartProvider>,
    );

    expect(screen.getAllByText("Hello").map((text) => text.tagName)).toEqual([
      "SPAN",
      "P",
    ]);
  });
});
