/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ReadonlyThreadProvider } from "@assistant-ui/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LexicalComposerInput } from "./LexicalComposerInput";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("LexicalComposerInput without a threads scope", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders a disabled composer inside a ReadonlyThreadProvider", async () => {
    await act(async () => {
      root.render(
        <ReadonlyThreadProvider messages={[]}>
          <LexicalComposerInput placeholder="Write a message" />
        </ReadonlyThreadProvider>,
      );
    });

    const textbox = container.querySelector('[role="textbox"]');
    expect(textbox).not.toBeNull();
    expect(textbox!.getAttribute("contenteditable")).toBe("false");
  });
});
