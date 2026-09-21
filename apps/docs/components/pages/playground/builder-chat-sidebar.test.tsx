// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import {
  PlaygroundChatProvider,
  PlaygroundChatThread,
} from "./builder-chat-sidebar";

const runtimes = vi.hoisted(() => ({
  chat: [] as AssistantRuntime[],
  preview: [] as AssistantRuntime[],
}));

vi.mock("@assistant-ui/ai-sdk", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@assistant-ui/ai-sdk")>();
  return {
    ...mod,
    useChatRuntime: (...args: Parameters<typeof mod.useChatRuntime>) => {
      const runtime = mod.useChatRuntime(...args);
      runtimes.chat.push(runtime);
      return runtime;
    },
  };
});

const setConfig = () => {};

function PreviewRuntime({ children }: { children: ReactNode }) {
  const runtime = useLocalRuntime({
    async run() {
      return { content: [] };
    },
  });
  runtimes.preview.push(runtime);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

const Playground = ({ threads }: { threads: number }) => (
  <PreviewRuntime>
    <PlaygroundChatProvider config={{} as never} setConfig={setConfig}>
      {Array.from({ length: threads }, (_, index) => (
        <PlaygroundChatThread key={index} />
      ))}
    </PlaygroundChatProvider>
  </PreviewRuntime>
);

const toolNames = (runtime: AssistantRuntime) =>
  Object.keys(runtime.thread.getModelContext().tools ?? {});

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  runtimes.chat.length = 0;
  runtimes.preview.length = 0;
});

it("keeps one builder tool registration when the sidebar and the sheet both mount a thread", async () => {
  const { rerender } = render(<Playground threads={1} />);
  await act(async () => {});
  rerender(<Playground threads={2} />);
  await act(async () => {});

  expect(toolNames(runtimes.chat.at(-1)!)).toEqual(["update_config"]);
  expect(toolNames(runtimes.preview.at(-1)!)).toEqual([]);
});
