// @vitest-environment jsdom

import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { Chat, useChat } from "@ai-sdk/react";
import {
  lastAssistantMessageIsCompleteWithToolCalls,
  type ChatTransport,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import type { AppendMessage, AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { useAISDKRuntime } from "./useAISDKRuntime";
import { useAISDKError } from "../hooks";
import { toCreateMessage } from "../converters/toCreateMessage";

const textOf = (message: UIMessage | undefined) =>
  message?.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("") ?? "";

const createTransport = () => {
  const events: string[] = [];
  const requests: {
    prompt: string;
    messages: string[];
    signal: AbortSignal | undefined;
    stream: (text: string) => void;
    emit: (...chunks: UIMessageChunk[]) => void;
    finish: () => void;
  }[] = [];
  let held: Promise<void> | undefined;
  let release = () => {};
  const transport: ChatTransport<UIMessage> = {
    async sendMessages({ messages, abortSignal }) {
      const prompt = textOf(messages.findLast((m) => m.role === "user"));
      events.push(`send ${prompt}`);
      let controller!: ReadableStreamDefaultController<UIMessageChunk>;
      const stream = new ReadableStream<UIMessageChunk>({
        start: (c) => {
          controller = c;
        },
      });
      requests.push({
        prompt,
        messages: messages.map(textOf).filter(Boolean),
        signal: abortSignal,
        stream: (text) => {
          controller.enqueue({ type: "start" });
          controller.enqueue({ type: "text-start", id: "t" });
          controller.enqueue({ type: "text-delta", id: "t", delta: text });
        },
        emit: (...chunks) => {
          for (const chunk of chunks) controller.enqueue(chunk);
        },
        finish: () => {
          controller.enqueue({ type: "text-end", id: "t" });
          controller.enqueue({ type: "finish" });
          controller.close();
        },
      });
      await held;
      return stream;
    },
    reconnectToStream: async () => null,
  };
  return {
    transport,
    events,
    requests,
    hold: () => {
      held = new Promise((resolve) => {
        release = () => {
          held = undefined;
          resolve();
        };
      });
    },
    release: () => release(),
  };
};

const QueuedPrompts = () => {
  const prompts = useAuiState((s) =>
    s.composer.queue.map((item) => item.prompt).join(","),
  );
  return <output data-testid="queued">{prompts}</output>;
};

const QueueError = () => {
  const error = useAISDKError();
  return <output data-testid="queue-error">{error?.message}</output>;
};

const setup = (
  options: Parameters<typeof useAISDKRuntime>[1] = {
    unstable_enableMessageQueue: true,
  },
) => {
  const harness = createTransport();
  const { result, rerender } = renderHook(
    (runtimeOptions) => {
      const chat = useChat({
        transport: harness.transport,
        onFinish: ({ message, isAbort }) => {
          harness.events.push(
            `finish ${isAbort ? "aborted" : textOf(message)}`,
          );
        },
      });
      return useAISDKRuntime(chat, runtimeOptions);
    },
    { initialProps: options },
  );
  const runtime = () => result.current as AssistantRuntime;
  render(
    <AssistantRuntimeProvider runtime={runtime()}>
      <QueuedPrompts />
      <QueueError />
    </AssistantRuntimeProvider>,
  );
  const send = (text: string, steer?: boolean) =>
    act(() => {
      runtime().thread.composer.setText(text);
      runtime().thread.composer.send(steer === undefined ? {} : { steer });
    });
  const queued = () => screen.getByTestId("queued").textContent;
  const isRunning = () => runtime().thread.getState().isRunning;
  return { ...harness, runtime, send, queued, isRunning, setOptions: rerender };
};

afterEach(() => {
  cleanup();
});

describe("useAISDKRuntime unstable_enableMessageQueue", () => {
  it("does not let a disabled queue's error hide a later direct-send error", async () => {
    let fail = true;
    function createMessage<UI_MESSAGE extends UIMessage>(
      message: AppendMessage,
    ) {
      if (fail) throw new Error("queue conversion failed");
      return toCreateMessage<UI_MESSAGE>(message);
    }
    const options = {
      unstable_enableMessageQueue: true,
      toCreateMessage: createMessage,
    };
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { send, requests, setOptions } = setup(options);
      await send("first");
      await waitFor(() =>
        expect(screen.getByTestId("queue-error").textContent).toBe(
          "queue conversion failed",
        ),
      );
      act(() => setOptions({ ...options, unstable_enableMessageQueue: false }));
      expect(screen.getByTestId("queue-error").textContent).toBe("");

      fail = false;
      await send("second");
      await waitFor(() => expect(requests).toHaveLength(1));
      act(() =>
        requests[0]!.emit({
          type: "error",
          errorText: "direct request failed",
        }),
      );
      await waitFor(() =>
        expect(screen.getByTestId("queue-error").textContent).toBe(
          "direct request failed",
        ),
      );
      act(() => setOptions(options));
      expect(screen.getByTestId("queue-error").textContent).toBe(
        "direct request failed",
      );
    } finally {
      logged.mockRestore();
    }
  });

  it("does not mark an earlier answer failed when a queued prompt fails before append", async () => {
    let fail = false;
    function createMessage<UI_MESSAGE extends UIMessage>(
      message: AppendMessage,
    ) {
      if (fail) throw new Error("conversion failed");
      return toCreateMessage<UI_MESSAGE>(message);
    }
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { send, requests, runtime, isRunning, queued } = setup({
        unstable_enableMessageQueue: true,
        toCreateMessage: createMessage,
      });
      await send("first");
      await waitFor(() => expect(requests).toHaveLength(1));
      await act(async () => {
        requests[0]!.stream("answer");
        requests[0]!.finish();
      });
      await waitFor(() => expect(isRunning()).toBe(false));
      const status = runtime().thread.getState().messages[1]!.status;
      fail = true;
      await send("second");
      await waitFor(() =>
        expect(screen.getByTestId("queue-error").textContent).toBe(
          "conversion failed",
        ),
      );
      expect(queued()).toBe("second");
      expect(runtime().thread.getState().messages).toHaveLength(2);
      expect(runtime().thread.getState().messages[1]!.status).toEqual(status);
    } finally {
      logged.mockRestore();
    }
  });

  it("retains a failed prompt and exposes the error until an explicit retry", async () => {
    const error = new Error("message conversion failed");
    let fail = true;
    function createMessage<UI_MESSAGE extends UIMessage>(
      message: AppendMessage,
    ) {
      if (fail) throw error;
      return toCreateMessage<UI_MESSAGE>(message);
    }
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { send, requests, queued, isRunning } = setup({
        unstable_enableMessageQueue: true,
        toCreateMessage: createMessage,
      });
      await send("first");
      await waitFor(() =>
        expect(screen.getByTestId("queue-error").textContent).toBe(
          error.message,
        ),
      );
      expect(queued()).toBe("first");
      expect(requests).toHaveLength(0);

      fail = false;
      await send("second", false);
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0]!.prompt).toBe("first");
      expect(queued()).toBe("second");
      expect(screen.getByTestId("queue-error").textContent).toBe("");
      await act(async () => {
        requests[0]!.stream("one");
        requests[0]!.finish();
      });
      await waitFor(() => expect(requests).toHaveLength(2));
      expect(requests[1]!.prompt).toBe("second");
      await act(async () => {
        requests[1]!.stream("two");
        requests[1]!.finish();
      });
      await waitFor(() => expect(isRunning()).toBe(false));
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });

  it("holds sends made during a run and sends them one request at a time", async () => {
    const { requests, events, send, queued, isRunning, runtime } = setup();

    await send("first");
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(runtime().thread.getState().capabilities.queue).toBe(true);

    await send("second", false);
    await send("third", false);
    await waitFor(() => expect(queued()).toBe("second,third"));
    expect(requests).toHaveLength(1);

    await act(async () => {
      requests[0]!.stream("one");
      requests[0]!.finish();
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.prompt).toBe("second");
    await waitFor(() => expect(queued()).toBe("third"));

    await act(async () => {
      requests[1]!.stream("two");
      requests[1]!.finish();
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]!.prompt).toBe("third");

    await act(async () => {
      requests[2]!.stream("three");
      requests[2]!.finish();
    });
    await waitFor(() => expect(isRunning()).toBe(false));
    expect(queued()).toBe("");
    expect(events).toEqual([
      "send first",
      "finish one",
      "send second",
      "finish two",
      "send third",
      "finish three",
    ]);
  });

  it("steering stops the running request and sends once it has settled", async () => {
    const { requests, events, hold, release, send, isRunning, runtime } =
      setup();

    hold();
    await send("first");
    await waitFor(() => expect(requests).toHaveLength(1));
    await waitFor(() => expect(isRunning()).toBe(true));

    await send("second", true);
    expect(requests[0]!.signal?.aborted).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(requests).toHaveLength(1);

    await act(async () => {
      release();
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.prompt).toBe("second");

    await act(async () => {
      requests[1]!.stream("two");
      requests[1]!.finish();
    });
    await waitFor(() => expect(isRunning()).toBe(false));
    expect(requests).toHaveLength(2);
    expect(events).toEqual([
      "send first",
      "finish aborted",
      "send second",
      "finish two",
    ]);
    expect(requests[1]!.messages).toEqual(["first", "second"]);
    expect(runtime().thread.composer.getState().text).toBe("");
  });

  it("keeps queued messages when the run is cancelled and sends them on the next send", async () => {
    const { requests, send, queued, isRunning, runtime } = setup();

    await send("first");
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => {
      requests[0]!.stream("partial");
    });
    await send("second", false);
    await waitFor(() => expect(queued()).toBe("second"));

    act(() => {
      runtime().thread.cancelRun();
    });
    await waitFor(() => expect(isRunning()).toBe(false));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(requests).toHaveLength(1);
    expect(queued()).toBe("second");

    await send("third", false);
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.prompt).toBe("second");
    await waitFor(() => expect(queued()).toBe("third"));
  });

  const cancelWithQueued = async (harness: ReturnType<typeof setup>) => {
    const { requests, send, queued, isRunning, runtime } = harness;
    await send("first");
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => {
      requests[0]!.stream("partial");
    });
    await send("second", false);
    await waitFor(() => expect(queued()).toBe("second"));
    act(() => {
      runtime().thread.cancelRun();
    });
    await waitFor(() => expect(isRunning()).toBe(false));
    expect(queued()).toBe("second");
  };

  it("drops queued messages when a message is edited", async () => {
    const harness = setup();
    const { requests, queued, isRunning, runtime } = harness;
    await cancelWithQueued(harness);

    act(() => {
      const composer = runtime().thread.getMessageByIndex(0).composer;
      composer.beginEdit();
      composer.setText("edited");
      composer.send();
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.prompt).toBe("edited");
    expect(queued()).toBe("");

    await act(async () => {
      requests[1]!.stream("two");
      requests[1]!.finish();
    });
    await waitFor(() => expect(isRunning()).toBe(false));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(requests).toHaveLength(2);
  });

  it("drops queued messages when a response is reloaded", async () => {
    const harness = setup();
    const { requests, queued, isRunning, runtime } = harness;
    await cancelWithQueued(harness);

    act(() => {
      runtime().thread.getMessageByIndex(1).reload();
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.prompt).toBe("first");
    expect(queued()).toBe("");

    await act(async () => {
      requests[1]!.stream("again");
      requests[1]!.finish();
    });
    await waitFor(() => expect(isRunning()).toBe(false));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(requests).toHaveLength(2);
  });

  it("keeps a cancelled steer queued alongside the restored unanswered draft", async () => {
    const { requests, hold, release, send, queued, isRunning, runtime } =
      setup();

    hold();
    await send("first");
    await waitFor(() => expect(requests).toHaveLength(1));
    await waitFor(() => expect(isRunning()).toBe(true));
    await send("second", true);

    act(() => {
      runtime().thread.cancelRun();
    });
    await act(async () => {
      release();
    });
    await waitFor(() => expect(queued()).toBe("second"));
    expect(requests).toHaveLength(1);
    expect(isRunning()).toBe(false);
    expect(runtime().thread.getState().messages).toEqual([]);
    expect(runtime().thread.composer.getState().text).toBe("first");
    expect(screen.getByTestId("queue-error").textContent).toBe("");

    await send("third");
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.prompt).toBe("second");
    expect(queued()).toBe("third");
    await act(async () => {
      requests[1]!.stream("two");
      requests[1]!.finish();
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]!.prompt).toBe("third");
    expect(queued()).toBe("");
  });

  it("steering while a client tool runs aborts the tool and sends without continuing its run", async () => {
    const harness = createTransport();
    let finishTool!: (result: string) => void;
    const execute = vi.fn(
      (_args: unknown, _context: { abortSignal: AbortSignal }) =>
        new Promise<string>((resolve) => {
          finishTool = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useAISDKRuntime(
        useChat({
          transport: harness.transport,
          sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        }),
        { unstable_enableMessageQueue: true },
      ),
    );
    result.current.registerModelContextProvider({
      getModelContext: () => ({
        tools: {
          weather: {
            parameters: { type: "object", properties: {} },
            execute,
          },
        },
      }),
    });

    act(() => {
      result.current.thread.composer.setText("first");
      result.current.thread.composer.send();
    });
    await waitFor(() => expect(harness.requests).toHaveLength(1));
    await act(async () => {
      harness.requests[0]!.emit(
        { type: "start" },
        {
          type: "tool-input-available",
          toolCallId: "tool-1",
          toolName: "weather",
          input: {},
        },
        { type: "finish" },
      );
      harness.requests[0]!.finish();
    });
    await waitFor(() => expect(execute).toHaveBeenCalledOnce());
    expect(result.current.thread.getState().isRunning).toBe(true);

    act(() => {
      result.current.thread.composer.setText("second");
      result.current.thread.composer.send({ steer: true });
    });
    await waitFor(() => expect(harness.requests).toHaveLength(2));
    expect(harness.requests[1]!.prompt).toBe("second");
    expect(execute.mock.calls[0]![1].abortSignal.aborted).toBe(true);
    expect(result.current.thread.getState().messages[1]?.content).toEqual([
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "tool-1",
        isError: true,
      }),
    ]);

    await act(async () => {
      finishTool("sunny");
      harness.requests[1]!.stream("two");
      harness.requests[1]!.finish();
    });
    await waitFor(() =>
      expect(result.current.thread.getState().isRunning).toBe(false),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(harness.requests).toHaveLength(2);
  });

  it("holds queued messages while sending is disabled", async () => {
    const harness = createTransport();
    const { result, rerender } = renderHook(
      ({ isSendDisabled }: { isSendDisabled: boolean }) =>
        useAISDKRuntime(useChat({ transport: harness.transport }), {
          unstable_enableMessageQueue: true,
          isSendDisabled,
        }),
      { initialProps: { isSendDisabled: false } },
    );

    act(() => {
      result.current.thread.append("first");
    });
    await waitFor(() => expect(harness.requests).toHaveLength(1));
    act(() => {
      result.current.thread.composer.setText("second");
      result.current.thread.composer.send({ steer: false });
    });
    rerender({ isSendDisabled: true });

    await act(async () => {
      harness.requests[0]!.stream("one");
      harness.requests[0]!.finish();
    });
    await waitFor(() =>
      expect(result.current.thread.getState().isRunning).toBe(false),
    );
    expect(harness.requests).toHaveLength(1);

    rerender({ isSendDisabled: false });
    await waitFor(() => expect(harness.requests).toHaveLength(2));
    expect(harness.requests[1]!.prompt).toBe("second");
  });

  it("holds a send made before its first effect when it mounts over a running chat", async () => {
    const harness = createTransport();
    const chat = new Chat({ transport: harness.transport });
    void chat.sendMessage({ text: "first" });
    await waitFor(() => expect(harness.requests).toHaveLength(1));
    expect(["submitted", "streaming"]).toContain(chat.status);

    const SendOnMount = ({ runtime }: { runtime: AssistantRuntime }) => {
      useLayoutEffect(() => {
        runtime.thread.composer.setText("second");
        runtime.thread.composer.send({ steer: false });
      }, [runtime]);
      return null;
    };
    const Host = () => {
      const runtime = useAISDKRuntime(useChat({ chat }), {
        unstable_enableMessageQueue: true,
      });
      return <SendOnMount runtime={runtime} />;
    };

    const actEnvironment = globalThis as {
      IS_REACT_ACT_ENVIRONMENT?: boolean | undefined;
    };
    const wasActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    const root = createRoot(document.createElement("div"));
    try {
      root.render(<Host />);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(harness.requests).toHaveLength(1);

      harness.requests[0]!.stream("one");
      harness.requests[0]!.finish();
      await waitFor(() => expect(harness.requests).toHaveLength(2));
      expect(harness.requests[1]!.prompt).toBe("second");
    } finally {
      root.unmount();
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
    }
  });

  it("exposes no queue when the option is omitted", async () => {
    const { requests, runtime, send, queued } = setup({});

    expect(runtime().thread.getState().capabilities.queue).toBe(false);
    await send("first");
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(queued()).toBe("");
  });
});
