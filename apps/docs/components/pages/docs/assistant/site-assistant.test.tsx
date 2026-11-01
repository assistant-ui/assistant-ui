// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useLocalRuntime, type AssistantRuntime } from "@assistant-ui/react";
import { SiteAssistant } from "./site-assistant";
import { useAssistantPanel } from "./context";

const scrollTo = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTo");

const state = vi.hoisted(() => {
  let release!: () => void;
  const loaded = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    loaded,
    release,
    pathname: "/docs",
    runtimes: [] as AssistantRuntime[],
    run: vi.fn(async () => ({
      content: [{ type: "text" as const, text: "Documentation answer" }],
    })),
  };
});

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => state.pathname,
}));

vi.mock("./session", async (importOriginal) => {
  await state.loaded;
  return { ...(await importOriginal<typeof import("./session")>()) };
});

vi.mock("@/runtimes/chat-runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/runtimes/chat-runtime")>()),
  useDocsChatRuntime: () => {
    const runtime = useLocalRuntime({ run: state.run });
    state.runtimes.push(runtime);
    return runtime;
  },
}));

vi.mock("./composer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./composer")>()),
  AssistantComposer: () => null,
  useSharedDocsModelSelection: () => ({ modelValue: "zai/glm-5.3-flash" }),
}));

vi.mock("./messages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./messages")>()),
  AssistantMessage: () => <p>Documentation answer</p>,
  UserMessage: () => <p>Documentation question</p>,
}));

function Page() {
  const { askAI } = useAssistantPanel();
  return (
    <>
      <h1>Documentation</h1>
      <input aria-label="Page input" />
      <button onClick={() => askAI("How do I install assistant-ui?")}>
        Ask about installation
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  state.runtimes.length = 0;
  localStorage.clear();
  vi.unstubAllGlobals();
  if (scrollTo) Object.defineProperty(Element.prototype, "scrollTo", scrollTo);
  else Reflect.deleteProperty(Element.prototype, "scrollTo");
});

it("defers the runtime until opening and retains a queued question, conversation and draft across closing", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(Element.prototype, "scrollTo", {
    configurable: true,
    value: () => {},
  });
  render(
    <SiteAssistant>
      <Page />
    </SiteAssistant>,
  );
  expect(state.runtimes).toHaveLength(0);
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "i", ctrlKey: true });
  expect(screen.queryByRole("status")).toBeNull();
  expect(state.runtimes).toHaveLength(0);

  fireEvent.click(
    screen.getByRole("button", { name: "Ask about installation" }),
  );
  expect(screen.getByRole("status").textContent).toBe("Loading chat…");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("status")).toBeNull();
  await act(async () => {
    state.release();
    await vi.dynamicImportSettled();
  });
  await waitFor(() => expect(state.runtimes.length).toBeGreaterThan(0));
  expect(state.run).not.toHaveBeenCalled();

  fireEvent.keyDown(document, { key: "i", ctrlKey: true });
  await waitFor(() => expect(state.run).toHaveBeenCalledTimes(1));
  const runtime = state.runtimes[0]!;
  await waitFor(() => {
    const { messages, isRunning } = runtime.thread.getState();
    expect(messages.map(({ role, content }) => ({ role, content }))).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "How do I install assistant-ui?" }],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Documentation answer" }],
      },
    ]);
    expect(isRunning).toBe(false);
  });
  await act(async () => runtime.thread.composer.setText("My follow-up draft"));
  fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
  fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
  expect(new Set(state.runtimes).size).toBe(1);
  expect(runtime.thread.getState().messages).toHaveLength(2);
  expect(runtime.thread.composer.getState().text).toBe("My follow-up draft");
  expect(state.run).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading", { name: "Documentation" })).toBeTruthy();
});
