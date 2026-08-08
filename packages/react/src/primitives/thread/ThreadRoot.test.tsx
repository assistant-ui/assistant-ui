// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../../context";
import { useLocalRuntime } from "../../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type {
  ChatModelAdapter,
  SpeechSynthesisAdapter,
  ThreadMessageLike,
} from "../../index";
import { ComposerPrimitiveInput } from "../composer/ComposerInput";
import { ThreadPrimitiveRoot } from "./ThreadRoot";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const waitForAbortAdapter: ChatModelAdapter = {
  async *run({ abortSignal }) {
    await new Promise<void>((resolve) => {
      if (abortSignal.aborted) {
        resolve();
        return;
      }
      abortSignal.addEventListener("abort", () => resolve(), { once: true });
    });
  },
};

const initialMessages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [{ type: "text", text: "Hello" }],
    status: { type: "complete", reason: "stop" },
  },
];

const createSpeechAdapter = () => {
  const cancel = vi.fn();
  const subscribers = new Set<() => void>();
  const utterance: SpeechSynthesisAdapter.Utterance = {
    status: { type: "running" },
    cancel,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };
  const adapter: SpeechSynthesisAdapter = {
    speak: vi.fn(() => utterance),
  };
  const finish = () => {
    utterance.status = { type: "ended", reason: "finished" };
    for (const subscriber of subscribers) subscriber();
  };

  return { adapter, cancel, finish };
};

type RuntimeRef = {
  current: ReturnType<typeof useLocalRuntime> | null;
};

const RuntimeProvider: FC<
  PropsWithChildren<{
    runtimeRef: RuntimeRef;
    speech: SpeechSynthesisAdapter;
    chatModel?: ChatModelAdapter | undefined;
  }>
> = ({ children, runtimeRef, speech, chatModel = noOpAdapter }) => {
  const runtime = useLocalRuntime(chatModel, {
    initialMessages,
    adapters: { speech },
  });
  runtimeRef.current = runtime;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const startSpeaking = (runtimeRef: RuntimeRef) => {
  act(() => {
    runtimeRef.current!.thread.getMessageByIndex(0).speak();
  });
};

const dispatchEscape = (target: EventTarget) => {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  act(() => target.dispatchEvent(event));
  return event;
};

describe("ThreadPrimitiveRoot", () => {
  it("stops active speech after the initiating control unmounts", async () => {
    const speech = createSpeechAdapter();
    const runtimeRef: RuntimeRef = { current: null };
    const App = ({ showControl }: { showControl: boolean }) => (
      <RuntimeProvider runtimeRef={runtimeRef} speech={speech.adapter}>
        <ThreadPrimitiveRoot>
          {showControl && <button data-testid="speak-control" />}
        </ThreadPrimitiveRoot>
      </RuntimeProvider>
    );
    const view = render(<App showControl />);

    const control = screen.getByTestId("speak-control");
    control.focus();
    startSpeaking(runtimeRef);
    await waitFor(() => {
      expect(runtimeRef.current!.thread.getState().speech).toBeDefined();
    });

    view.rerender(<App showControl={false} />);
    const event = dispatchEscape(document.body);

    expect(speech.cancel).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not consume Escape when no speech is active", () => {
    const speech = createSpeechAdapter();
    const runtimeRef: RuntimeRef = { current: null };
    render(
      <RuntimeProvider runtimeRef={runtimeRef} speech={speech.adapter}>
        <ThreadPrimitiveRoot>
          <button data-testid="thread-control" />
        </ThreadPrimitiveRoot>
      </RuntimeProvider>,
    );

    const event = dispatchEscape(screen.getByTestId("thread-control"));

    expect(speech.cancel).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("stops speech from outside the only mounted thread", async () => {
    const speech = createSpeechAdapter();
    const runtimeRef: RuntimeRef = { current: null };
    render(
      <>
        <RuntimeProvider runtimeRef={runtimeRef} speech={speech.adapter}>
          <ThreadPrimitiveRoot />
        </RuntimeProvider>
        <button data-testid="outside-control" />
      </>,
    );
    startSpeaking(runtimeRef);
    await waitFor(() => {
      expect(runtimeRef.current!.thread.getState().speech).toBeDefined();
    });

    const event = dispatchEscape(screen.getByTestId("outside-control"));

    expect(speech.cancel).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores speech ending between the rendered state and Escape", async () => {
    const speech = createSpeechAdapter();
    const runtimeRef: RuntimeRef = { current: null };
    render(
      <RuntimeProvider runtimeRef={runtimeRef} speech={speech.adapter}>
        <ThreadPrimitiveRoot />
      </RuntimeProvider>,
    );
    startSpeaking(runtimeRef);
    await waitFor(() => {
      expect(runtimeRef.current!.thread.getState().speech).toBeDefined();
    });

    expect(() => {
      act(() => {
        speech.finish();
        document.body.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
          }),
        );
      });
    }).not.toThrow();
    expect(speech.cancel).not.toHaveBeenCalled();
  });

  it("lets a composer mounted after the root consume Escape first", async () => {
    const speech = createSpeechAdapter();
    const runtimeRef: RuntimeRef = { current: null };
    const App = ({ showComposer }: { showComposer: boolean }) => (
      <RuntimeProvider
        runtimeRef={runtimeRef}
        speech={speech.adapter}
        chatModel={waitForAbortAdapter}
      >
        <ThreadPrimitiveRoot>
          {showComposer && <ComposerPrimitiveInput data-testid="composer" />}
        </ThreadPrimitiveRoot>
      </RuntimeProvider>
    );
    const view = render(<App showComposer={false} />);
    startSpeaking(runtimeRef);
    act(() => {
      runtimeRef.current!.thread.append("Run");
    });
    await waitFor(() => {
      expect(runtimeRef.current!.thread.getState().speech).toBeDefined();
      expect(runtimeRef.current!.thread.getState().isRunning).toBe(true);
    });

    view.rerender(<App showComposer />);
    const event = dispatchEscape(screen.getByTestId("composer"));

    await waitFor(() => {
      expect(runtimeRef.current!.thread.getState().isRunning).toBe(false);
    });
    expect(speech.cancel).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});
