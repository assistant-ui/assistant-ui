// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LibraryShowcase } from "./library-showcase";
import { PrimitivesAnatomy } from "./primitives-anatomy";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps integration source, clipboard, and guide aligned during keyboard selection", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  render(
    <LibraryShowcase
      setupTabs={[
        {
          id: "ai-sdk",
          label: "AI SDK",
          caption: "Streams from your route.",
          docs: "/docs/runtimes/ai-sdk/overview",
          code: "useChatRuntime()",
          html: "<pre><code>useChatRuntime()</code></pre>",
        },
        {
          id: "langgraph",
          label: "LangGraph",
          caption: "Streams from your graph.",
          docs: "/docs/runtimes/langgraph/overview",
          code: "useLangGraphRuntime()",
          html: "<pre><code>useLangGraphRuntime()</code></pre>",
        },
      ]}
    />,
  );
  const integrations = screen.getByRole("tablist", {
    name: "Backend integration",
  });
  const aiSdk = within(integrations).getByRole("tab", { name: "AI SDK" });
  const langgraph = within(integrations).getByRole("tab", {
    name: "LangGraph",
  });
  act(() => aiSdk.focus());
  fireEvent.keyDown(aiSdk, { key: "ArrowRight" });
  await waitFor(() =>
    expect(langgraph.getAttribute("aria-selected")).toBe("true"),
  );
  const panel = document.getElementById(
    langgraph.getAttribute("aria-controls")!,
  )!;
  expect(panel.textContent).toContain("useLangGraphRuntime()");
  expect(
    within(panel)
      .getByRole("link", { name: "Read the LangGraph guide →" })
      .getAttribute("href"),
  ).toBe("/docs/runtimes/langgraph/overview");
  fireEvent.click(within(panel).getByRole("button", { name: "Copy source" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenNthCalledWith(1, "useLangGraphRuntime()"),
  );
  fireEvent.keyDown(langgraph, { key: "ArrowLeft" });
  await waitFor(() => expect(aiSdk.getAttribute("aria-selected")).toBe("true"));
  const aiSdkPanel = document.getElementById(
    aiSdk.getAttribute("aria-controls")!,
  )!;
  fireEvent.click(
    within(aiSdkPanel).getByRole("button", { name: "Copy source" }),
  );
  await waitFor(() =>
    expect(writeText).toHaveBeenNthCalledWith(2, "useChatRuntime()"),
  );
});

it("lets readers select a primitive without hover or a timer", () => {
  render(<PrimitivesAnatomy />);
  const controls = screen.getByRole("group", { name: "Thread primitives" });
  const composer = within(controls).getByRole("button", { name: "Composer" });
  fireEvent.click(composer);
  expect(composer.getAttribute("aria-pressed")).toBe("true");
  expect(
    within(controls)
      .getByRole("button", { name: "Root" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
  expect(screen.getByText("Input, attachments, dictation, send.")).toBeTruthy();
});
