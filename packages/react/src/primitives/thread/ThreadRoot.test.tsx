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
  const utterance: SpeechSynthesisAdapter.Utterance = {
    status: { type: "running" },
    cancel,
    subscribe: () => () => {},
  };
  const adapter: SpeechSynthesisAdapter = {
    speak: vi.fn(() => utterance),
  };

  return { adapter, cancel };
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
});
