/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSONTree } from "./JSONTree";
import { CopyButton } from "./CopyButton";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("JSONTree interactions", () => {
  let container: HTMLDivElement;
  let root: Root;
  let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.useFakeTimers();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const button = (text: string) => {
    const result = Array.from(container.querySelectorAll("button")).find(
      (node) =>
        node.textContent?.includes(text) ||
        node.getAttribute("aria-label") === text,
    );
    if (!result) throw new Error(`Missing button: ${text}`);
    return result;
  };
  const click = (text: string) => act(async () => button(text).click());

  it.each([false, true])(
    "expands, reveals remaining entries and collapses in compact=%s",
    async (compact) => {
      const value = Array.from({ length: 103 }, (_, i) => `entry-${i}`);
      await act(async () =>
        root.render(<JSONTree value={value} openDepth={0} compact={compact} />),
      );
      expect(container.textContent).not.toContain("entry-");
      await click("[103]");
      expect(container.textContent).toContain("entry-99");
      expect(container.textContent).not.toContain("entry-100");
      await click("+3 more");
      expect(container.textContent).toContain("entry-102");
      await click("[103]");
      expect(container.textContent).not.toContain("entry-");
      await click("[103]");
      expect(container.textContent).toContain("entry-102");
    },
  );

  it("copies all hidden entries and uses the latest value without expanding", async () => {
    let value = Array.from({ length: 103 }, (_, i) => ({ id: i }));
    await act(async () =>
      root.render(<JSONTree value={value} openDepth={0} />),
    );
    await click("Copy JSON");
    expect(writeText).toHaveBeenLastCalledWith(JSON.stringify(value, null, 2));
    expect(button("Copied")).toBeDefined();
    value = [...value, { id: 103 }];
    await act(async () =>
      root.render(<JSONTree value={value} openDepth={0} />),
    );
    await click("Copied");
    expect(writeText).toHaveBeenLastCalledWith(JSON.stringify(value, null, 2));
    expect(container.textContent).not.toContain("id");
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(button("Copy JSON")).toBeDefined();
  });

  it("keeps nested nodes collapsed until requested", async () => {
    await act(async () =>
      root.render(<JSONTree value={{ nested: { message: "inside" } }} />),
    );
    expect(container.textContent).toContain("nested");
    expect(container.textContent).not.toContain("inside");
    await click("nested");
    expect(container.textContent).toContain("inside");
  });

  it("keeps compact small values inline and copies formatted JSON", async () => {
    const value = { query: "hello" };
    await act(async () => root.render(<JSONTree value={value} compact />));
    expect(container.querySelector("code")?.textContent).toBe(
      JSON.stringify(value),
    );
    await click("Copy JSON");
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(value, null, 2));
  });

  it("keeps empty string copy controls disabled and evaluates lazy values only on click", async () => {
    const getValue = vi.fn(() => "lazy value");
    await act(async () =>
      root.render(
        <>
          <CopyButton value="  " label="Empty" />
          <CopyButton value={getValue} label="Lazy" />
        </>,
      ),
    );
    expect(button("Empty").disabled).toBe(true);
    expect(getValue).not.toHaveBeenCalled();
    await click("Lazy");
    expect(getValue).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("lazy value");
  });
});
