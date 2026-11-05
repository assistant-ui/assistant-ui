// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CodeGroup, Pre } from "./code-block";

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

const render = (node: ReactNode) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(node));
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return container;
};

const code = (text: string) => (
  <code>
    <span className="line">{text}</span>
  </code>
);

it("numbers the lines of a fence and drops shiki's background and icon", () => {
  const container = render(
    <Pre
      title="app.ts"
      icon="<svg />"
      style={{ backgroundColor: "#1e1e2e", color: "#cdd6f4" }}
    >
      {code("const a = 1;")}
    </Pre>,
  );

  const pre = container.querySelector("pre")!;
  expect(pre.hasAttribute("data-line-numbers")).toBe(true);
  expect(pre.style.backgroundColor).toBe("");
  expect(pre.style.color).toBe("rgb(205, 214, 244)");
  expect(pre.hasAttribute("icon")).toBe(false);
  expect(container.querySelector("figcaption")?.textContent).toBe("app.ts");
});

it("copies the code without the line numbers", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const container = render(<Pre>{code("pnpm dev")}</Pre>);

  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('button[aria-label="Copy code"]')!
      .click(),
  );

  expect(writeText).toHaveBeenCalledWith("pnpm dev");
});

it("labels a code group's tabs from fence titles, even inside the fragments MDX adds", () => {
  const container = render(
    <CodeGroup>
      <>
        <Pre title="AI SDK">{code("useHarness()")}</Pre>
      </>
      <>
        <Pre title="Mastra">{code("mastra()")}</Pre>
      </>
      <Pre>{code("untitled()")}</Pre>
    </CodeGroup>,
  );

  const tabs = [...container.querySelectorAll('[role="tab"]')];
  expect(tabs.map((tab) => tab.textContent)).toEqual([
    "AI SDK",
    "Mastra",
    "Code 3",
  ]);
  expect(container.querySelectorAll("pre")).toHaveLength(1);
  expect(container.querySelector("pre")?.textContent).toBe("useHarness()");

  act(() => (tabs[1] as HTMLButtonElement).click());
  expect(container.querySelector("pre")?.textContent).toBe("mastra()");
  expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");

  act(() =>
    tabs[1]!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    ),
  );
  expect(container.querySelector("pre")?.textContent).toBe("untitled()");
  expect(document.activeElement).toBe(tabs[2]);
});
