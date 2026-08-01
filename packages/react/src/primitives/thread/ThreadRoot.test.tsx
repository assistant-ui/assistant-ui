// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../../context";
import { useLocalRuntime } from "../../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type {
  ChatModelAdapter,
  SpeechSynthesisAdapter,
  ThreadMessageLike,
} from "../../index";
import { ThreadPrimitiveRoot } from "./ThreadRoot";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
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
  }>
> = ({ children, runtimeRef, speech }) => {
  const runtime = useLocalRuntime(noOpAdapter, {
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
    fireEvent.pointerDown(control);
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

  it("only stops speech in the thread that received Escape", async () => {
    const firstSpeech = createSpeechAdapter();
    const secondSpeech = createSpeechAdapter();
    const firstRuntimeRef: RuntimeRef = { current: null };
    const secondRuntimeRef: RuntimeRef = { current: null };
    render(
      <>
        <RuntimeProvider
          runtimeRef={firstRuntimeRef}
          speech={firstSpeech.adapter}
        >
          <ThreadPrimitiveRoot>
            <button data-testid="first-thread-control" />
          </ThreadPrimitiveRoot>
        </RuntimeProvider>
        <RuntimeProvider
          runtimeRef={secondRuntimeRef}
          speech={secondSpeech.adapter}
        >
          <ThreadPrimitiveRoot>
            <button data-testid="second-thread-control" />
          </ThreadPrimitiveRoot>
        </RuntimeProvider>
      </>,
    );

    startSpeaking(firstRuntimeRef);
    startSpeaking(secondRuntimeRef);
    await waitFor(() => {
      expect(firstRuntimeRef.current!.thread.getState().speech).toBeDefined();
      expect(secondRuntimeRef.current!.thread.getState().speech).toBeDefined();
    });

    const event = dispatchEscape(screen.getByTestId("second-thread-control"));

    expect(firstSpeech.cancel).not.toHaveBeenCalled();
    expect(secondSpeech.cancel).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("uses the active thread when Escape targets the document body", async () => {
    const firstSpeech = createSpeechAdapter();
    const secondSpeech = createSpeechAdapter();
    const firstRuntimeRef: RuntimeRef = { current: null };
    const secondRuntimeRef: RuntimeRef = { current: null };
    render(
      <>
        <RuntimeProvider
          runtimeRef={firstRuntimeRef}
          speech={firstSpeech.adapter}
        >
          <ThreadPrimitiveRoot>
            <button data-testid="first-active-control" />
          </ThreadPrimitiveRoot>
        </RuntimeProvider>
        <RuntimeProvider
          runtimeRef={secondRuntimeRef}
          speech={secondSpeech.adapter}
        >
          <ThreadPrimitiveRoot>
            <button data-testid="second-active-control" />
          </ThreadPrimitiveRoot>
        </RuntimeProvider>
      </>,
    );

    startSpeaking(firstRuntimeRef);
    startSpeaking(secondRuntimeRef);
    await waitFor(() => {
      expect(firstRuntimeRef.current!.thread.getState().speech).toBeDefined();
      expect(secondRuntimeRef.current!.thread.getState().speech).toBeDefined();
    });
    fireEvent.pointerDown(screen.getByTestId("second-active-control"));

    const event = dispatchEscape(document.body);

    expect(firstSpeech.cancel).not.toHaveBeenCalled();
    expect(secondSpeech.cancel).toHaveBeenCalledOnce();
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
});
