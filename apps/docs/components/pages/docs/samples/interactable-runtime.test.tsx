// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { InteractableRuntimeProvider } from "./interactable-runtime";

const reload = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const useDocsChatRuntime = vi.hoisted(() =>
  vi.fn(() => ({ threads: { reload } }) as never),
);
const mocks = vi.hoisted(() => ({ claims: 0 }));
const useDocsCloud = vi.hoisted(() =>
  vi.fn(() => ({ cloud: "cloud", claims: mocks.claims })),
);

vi.mock("@/runtimes/chat-runtime", () => ({
  useDocsChatRuntime,
  useDocsCloud,
}));

vi.mock("@assistant-ui/react", () => ({
  AssistantRuntimeProvider: ({ children }: { children?: unknown }) => children,
  useAui: () => ({}),
  Suggestions: (v: unknown) => v,
  unstable_Interactables: () => ({}),
  WebSpeechSynthesisAdapter: class WebSpeechSynthesisAdapter {},
  WebSpeechDictationAdapter: class WebSpeechDictationAdapter {},
  SimpleImageAttachmentAdapter: class SimpleImageAttachmentAdapter {},
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.claims = 0;
});

const runtimeOptions = () =>
  useDocsChatRuntime.mock.calls.at(-1)![0] as {
    cloud?: unknown;
    sendAutomatically?: boolean;
  };

it("wires the interactable sample through useDocsCloud", () => {
  render(<InteractableRuntimeProvider>{null}</InteractableRuntimeProvider>);

  expect(useDocsCloud).toHaveBeenCalled();
  expect(runtimeOptions().cloud).toBe("cloud");
  expect(runtimeOptions().sendAutomatically).toBe(true);
});

it("reloads the interactable thread list only after a claim moved threads", () => {
  const { rerender } = render(
    <InteractableRuntimeProvider>{null}</InteractableRuntimeProvider>,
  );

  expect(reload).not.toHaveBeenCalled();

  mocks.claims = 1;
  rerender(<InteractableRuntimeProvider>{null}</InteractableRuntimeProvider>);

  expect(reload).toHaveBeenCalledOnce();
});
