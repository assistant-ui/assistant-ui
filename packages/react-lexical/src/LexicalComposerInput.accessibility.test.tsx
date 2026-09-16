/** @vitest-environment jsdom */
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LexicalComposerInput } from "./LexicalComposerInput";

const { aui } = vi.hoisted(() => ({
  aui: { composer: { setText: () => {} }, on: () => () => {} },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => aui,
  useAuiState: () => false,
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("LexicalComposerInput accessibility", () => {
  let container: HTMLDivElement;
  let root: Root;

  const textbox = () => container.querySelector('[role="textbox"]')!;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("forwards the accessible label to the editable textbox", async () => {
    await act(async () => {
      root.render(
        <LexicalComposerInput
          aria-label="Message"
          placeholder="Write a message"
        />,
      );
    });
    expect(textbox().getAttribute("aria-label")).toBe("Message");
    expect(
      container
        .querySelector(".aui-lexical-editor")!
        .hasAttribute("aria-label"),
    ).toBe(false);
  });

  it("forwards referenced labels to the textbox", async () => {
    await act(async () => {
      root.render(
        <>
          <span id="message-label">Your message</span>
          <LexicalComposerInput
            aria-label="Fallback"
            aria-labelledby="message-label"
          />
        </>,
      );
    });
    expect(textbox().getAttribute("aria-label")).toBe("Fallback");
    expect(textbox().getAttribute("aria-labelledby")).toBe("message-label");
    expect(
      document.getElementById(textbox().getAttribute("aria-labelledby")!)!
        .textContent,
    ).toBe("Your message");
  });

  it("updates and removes labels without replacing the textbox", async () => {
    await act(async () =>
      root.render(<LexicalComposerInput aria-label="Message" />),
    );
    const original = textbox();
    await act(async () =>
      root.render(<LexicalComposerInput aria-label="Edit message" />),
    );
    expect(textbox()).toBe(original);
    expect(textbox().getAttribute("aria-label")).toBe("Edit message");
    await act(async () =>
      root.render(<LexicalComposerInput aria-labelledby="external-label" />),
    );
    expect(textbox()).toBe(original);
    expect(textbox().hasAttribute("aria-label")).toBe(false);
    expect(textbox().getAttribute("aria-labelledby")).toBe("external-label");
    await act(async () => root.render(<LexicalComposerInput />));
    expect(textbox().hasAttribute("aria-labelledby")).toBe(false);
  });

  it("keeps refs, styling, identifiers, and event handlers on the wrapper", async () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    await act(async () => {
      root.render(
        <LexicalComposerInput
          ref={ref}
          id="composer-shell"
          className="custom"
          style={{ maxHeight: 200 }}
          onClick={onClick}
          aria-label="Message"
        />,
      );
    });
    const wrapper = container.querySelector(".aui-lexical-editor")!;
    expect(ref.current).toBe(wrapper);
    expect(wrapper.id).toBe("composer-shell");
    expect(wrapper.classList.contains("custom")).toBe(true);
    expect(ref.current!.style.maxHeight).toBe("200px");
    expect(ref.current!.style.overflowY).toBe("auto");
    await act(async () => {
      textbox().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("connects hint text to the textbox and updates the description reference", async () => {
    const renderDescription = async (id?: string) => {
      await act(async () => {
        root.render(
          <>
            <span id="composer-hint">Press Enter to send</span>
            <span id="composer-error">Message is required</span>
            <LexicalComposerInput aria-describedby={id} />
          </>,
        );
      });
    };
    await renderDescription("composer-hint");
    const original = textbox();
    expect(textbox().getAttribute("aria-describedby")).toBe("composer-hint");
    expect(
      container
        .querySelector(".aui-lexical-editor")!
        .hasAttribute("aria-describedby"),
    ).toBe(false);
    await renderDescription("composer-error");
    expect(textbox()).toBe(original);
    expect(textbox().getAttribute("aria-describedby")).toBe("composer-error");
    await renderDescription();
    expect(textbox()).toBe(original);
    expect(textbox().hasAttribute("aria-describedby")).toBe(false);
  });
});
