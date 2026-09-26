import { describe, it, expect, vi } from "vitest";
import {
  createAssistantStream,
  createAssistantStreamController,
  createAssistantStreamResponse,
} from "./assistant-stream";
import { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import { DataStreamDecoder } from "../serialization/data-stream/DataStream";
import { AssistantMessageAccumulator } from "../accumulators/assistant-message-accumulator";
import type { AssistantMessage } from "../utils/types";
import { toolResultStream } from "../tool/toolResultStream";
import {
  AssistantTransportDecoder,
  AssistantTransportEncoder,
} from "../serialization/assistant-transport/AssistantTransport";

const accumulate = async (response: Response): Promise<AssistantMessage> => {
  const stream = AssistantStream.fromResponse(
    response,
    new DataStreamDecoder(),
  );
  let last: AssistantMessage | undefined;
  await stream.pipeThrough(new AssistantMessageAccumulator()).pipeTo(
    new WritableStream({
      write(message) {
        last = message;
      },
    }),
  );
  return last!;
};

const collectChunks = async (
  stream: AssistantStream,
): Promise<AssistantStreamChunk[]> => {
  const chunks: AssistantStreamChunk[] = [];
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      },
    }),
  );
  return chunks;
};

const captureUnhandledRejections = async (
  callback: () => Promise<void>,
): Promise<unknown[]> => {
  const reasons: unknown[] = [];
  const listener = (reason: unknown) => reasons.push(reason);
  process.on("unhandledRejection", listener);
  try {
    await callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return reasons;
  } finally {
    process.off("unhandledRejection", listener);
  }
};

describe("tool-call writes after cancellation", () => {
  it("ignores setResponse after the consumer cancels", async () => {
    const unhandledRejections = await captureUnhandledRejections(async () => {
      const [stream, controller] = createAssistantStreamController();
      const toolCall = controller.addToolCallPart({
        toolCallId: "t1",
        toolName: "search",
      });

      const reader = stream.getReader();
      await reader.cancel("consumer stopped");
      await new Promise((resolve) => setTimeout(resolve, 0));

      toolCall.setResponse({ result: "ok" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(unhandledRejections).toEqual([]);
  });

  it("ignores args appends and close after the consumer cancels", async () => {
    const unhandledRejections = await captureUnhandledRejections(async () => {
      const [stream, controller] = createAssistantStreamController();
      const toolCall = controller.addToolCallPart({
        toolCallId: "t1",
        toolName: "search",
      });

      const reader = stream.getReader();
      await reader.cancel("consumer stopped");
      await new Promise((resolve) => setTimeout(resolve, 0));

      toolCall.argsText.append('{"q":1}');
      toolCall.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(unhandledRejections).toEqual([]);
  });
});

describe("controller close idempotence", () => {
  it("tolerates a second close after the stream drains", async () => {
    const [stream, controller] = createAssistantStreamController();
    controller.appendText("hi");
    controller.close();

    const reader = stream.getReader();
    while (!(await reader.read()).done) {
      // drain
    }

    expect(() => controller.close()).not.toThrow();
  });
});

describe("raw chunk ordering", () => {
  it("emits synchronous raw chunks before an appended part body", async () => {
    const before: AssistantStreamChunk = {
      type: "annotations",
      path: [],
      annotations: ["before"],
    };
    const after: AssistantStreamChunk = {
      type: "annotations",
      path: [],
      annotations: ["after"],
    };

    const chunks = await collectChunks(
      createAssistantStream((controller) => {
        controller.enqueue(before);
        controller.appendText("child");
        controller.enqueue(after);
      }),
    );

    expect(chunks).toEqual([
      before,
      {
        type: "part-start",
        path: [],
        part: { type: "text" },
      },
      after,
      {
        type: "text-delta",
        path: [0],
        textDelta: "child",
      },
      {
        type: "part-finish",
        path: [0],
      },
    ]);
  });
});

describe("createAssistantStream task settlement", () => {
  it("finishes open text and reasoning parts and cuts off open tool calls when the callback throws", async () => {
    const chunks = await collectChunks(
      createAssistantStream(async (controller) => {
        controller.addTextPart().append("partial");
        controller.addReasoningPart().append("thinking");
        controller.addToolCallPart({ toolCallId: "t1", toolName: "search" });
        throw new Error("provider failed");
      }),
    );

    expect(chunks.filter((c) => c.type === "error")).toHaveLength(1);
    expect(chunks).toContainEqual({
      type: "text-delta",
      path: [0],
      textDelta: "partial",
    });
    expect(
      chunks.filter((c) => c.type === "part-finish").map((c) => c.path),
    ).toEqual([[0], [1]]);
    expect(chunks.map((c) => c.type)).not.toContain(
      "tool-call-args-text-finish",
    );
  });

  it.each(["appendText", "appendReasoning"] as const)(
    "finishes the part %s opened when the callback throws",
    async (method) => {
      const chunks = await collectChunks(
        createAssistantStream((controller) => {
          controller[method]("partial");
          throw new Error("provider failed");
        }),
      );

      expect(chunks.map((c) => c.type)).toEqual([
        "part-start",
        "error",
        "text-delta",
        "part-finish",
      ]);
    },
  );

  it("does not run a frontend tool whose call was open when the callback threw", async () => {
    const execute = vi.fn(() => "confirmed");
    const response = new Response(
      createAssistantStream((controller) => {
        controller.appendText("partial");
        controller.addToolCallPart({ toolCallId: "t1", toolName: "confirm" });
        controller
          .addToolCallPart({ toolCallId: "t2", toolName: "confirm" })
          .argsText.append('{"orderId":');
        throw new Error("upstream failed");
      }).pipeThrough(new AssistantTransportEncoder()),
    );

    let message: AssistantMessage | undefined;
    await AssistantStream.fromResponse(
      response,
      new AssistantTransportDecoder(),
    )
      .pipeThrough(
        toolResultStream(
          { confirm: { parameters: { type: "object" }, execute } },
          new AbortController().signal,
          async () => {},
        ),
      )
      .pipeThrough(new AssistantMessageAccumulator())
      .pipeTo(
        new WritableStream({
          write(m) {
            message = m;
          },
        }),
      );

    expect(execute).not.toHaveBeenCalled();
    expect(message?.status).toMatchObject({
      type: "incomplete",
      reason: "error",
    });
    expect(message?.parts).toMatchObject([
      { type: "text", text: "partial", status: { type: "complete" } },
      { toolCallId: "t1", state: "partial-call" },
      { toolCallId: "t2", state: "partial-call", argsText: '{"orderId":' },
    ]);
  });

  it("ends when the callback throws while a merged stream is still open", async () => {
    const cancelSource = vi.fn();
    let chunks: AssistantStreamChunk[] = [];
    const unhandledRejections = await captureUnhandledRejections(async () => {
      chunks = await collectChunks(
        createAssistantStream(async (controller) => {
          controller.merge(
            createAssistantStream((inner) => {
              inner.addToolCallPart("search");
            }),
          );
          controller.merge(new ReadableStream({ cancel: cancelSource }));
          throw new Error("outer failed");
        }),
      );
    });

    expect(chunks.filter((c) => c.type === "error")).toHaveLength(1);
    expect(cancelSource).toHaveBeenCalledOnce();
    expect(unhandledRejections).toEqual([]);
  });

  it("stops tracking an input once it finishes", async () => {
    let tracked: Set<unknown> | undefined;
    await collectChunks(
      createAssistantStream(async (controller) => {
        tracked = (
          controller as unknown as { _state: { openInputs: Set<unknown> } }
        )._state.openInputs;
        controller.appendText("a");
        controller.addReasoningPart().close();
        controller.addToolCallPart("search").setResponse({ result: 1 });
        controller.merge(createAssistantStream(() => {}));
      }),
    );

    expect(tracked?.size).toBe(0);
  });

  it("closes the outer stream when a merged stream throws with an open part", async () => {
    const chunks = await collectChunks(
      createAssistantStream((controller) => {
        controller.merge(
          createAssistantStream(async (inner) => {
            inner.addToolCallPart("search");
            throw new Error("inner failed");
          }),
        );
      }),
    );

    expect(chunks.map((c) => c.type)).toEqual(["part-start", "error"]);
  });

  it("emits callback failures without leaking an unhandled rejection", async () => {
    let chunks: AssistantStreamChunk[] = [];
    const unhandledRejections = await captureUnhandledRejections(async () => {
      chunks = await collectChunks(
        createAssistantStream(async () => {
          throw new Error("provider failed");
        }),
      );
    });

    expect(chunks).toEqual([
      {
        type: "error",
        path: [],
        error: "Error: provider failed",
      },
    ]);
    expect(unhandledRejections).toEqual([]);
  });

  it("does not settle the stream again after cancellation", async () => {
    let finishCallback!: () => void;
    const callbackPending = new Promise<void>((resolve) => {
      finishCallback = resolve;
    });

    const unhandledRejections = await captureUnhandledRejections(async () => {
      const reader = createAssistantStream(() => callbackPending).getReader();
      await reader.cancel("consumer stopped");
      finishCallback();
      await callbackPending;
    });

    expect(unhandledRejections).toEqual([]);
  });

  it("waits for merged source cleanup during cancellation", async () => {
    let finishCleanup = () => {};
    const cleanup = new Promise<void>((resolve) => {
      finishCleanup = resolve;
    });
    const cancelSource = vi.fn(() => cleanup);
    const stream = createAssistantStream((controller) => {
      controller.merge(new ReadableStream({ cancel: cancelSource }));
      return new Promise(() => {});
    });

    let cancelSettled = false;
    const cancel = stream.cancel().then(() => {
      cancelSettled = true;
    });

    await vi.waitFor(() => expect(cancelSource).toHaveBeenCalledOnce());
    expect(cancelSettled).toBe(false);

    finishCleanup();
    await expect(cancel).resolves.toBeUndefined();
    expect(cancelSettled).toBe(true);
  });

  it("reports callback failures after the controller is explicitly closed", async () => {
    const error = new Error("cleanup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const chunks = await collectChunks(
        createAssistantStream((controller) => {
          controller.close();
          throw error;
        }),
      );

      expect(chunks).toEqual([]);
      expect(consoleError).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith(error);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not report callback failures caused after cancellation", async () => {
    let failCallback!: (error: Error) => void;
    const callbackPending = new Promise<void>((_, reject) => {
      failCallback = reject;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const unhandledRejections = await captureUnhandledRejections(async () => {
        const reader = createAssistantStream(() => callbackPending).getReader();
        await reader.cancel("consumer stopped");
        failCallback(new Error("provider stopped"));
        await callbackPending.catch(() => undefined);
      });

      expect(unhandledRejections).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not settle the outer stream again after a merged stream errors", async () => {
    let finishCallback!: () => void;
    const callbackPending = new Promise<void>((resolve) => {
      finishCallback = resolve;
    });
    const streamError = new Error("merged stream failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const unhandledRejections = await captureUnhandledRejections(async () => {
        const stream = createAssistantStream(async (controller) => {
          controller.merge(
            new ReadableStream({
              start(streamController) {
                streamController.error(streamError);
              },
            }),
          );
          await callbackPending;
        });

        await expect(collectChunks(stream)).rejects.toBe(streamError);
        finishCallback();
        await callbackPending;
      });

      expect(unhandledRejections).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith(streamError);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("surfaces a merged stream error while sibling cleanup continues", async () => {
    let finishCleanup = () => {};
    const cleanup = new Promise<void>((resolve) => {
      finishCleanup = resolve;
    });
    const cancelSource = vi.fn(() => cleanup);
    const streamError = new Error("merged stream failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const stream = createAssistantStream((controller) => {
        controller.merge(
          new ReadableStream({
            start(streamController) {
              streamController.error(streamError);
            },
          }),
        );
        controller.merge(new ReadableStream({ cancel: cancelSource }));
        return new Promise(() => {});
      });
      const readResult = stream
        .getReader()
        .read()
        .then(
          (value) => ({ value }),
          (error: unknown) => ({ error }),
        );

      await vi.waitFor(() => expect(cancelSource).toHaveBeenCalledOnce());
      await expect(readResult).resolves.toEqual({ error: streamError });
    } finally {
      finishCleanup();
      await cleanup;
      consoleError.mockRestore();
    }
  });

  it("emits an error chunk when merging a locked stream", async () => {
    const source = new ReadableStream();
    const sourceReader = source.getReader();

    try {
      const chunks = await collectChunks(
        createAssistantStream((controller) => {
          controller.merge(source);
        }),
      );

      expect(chunks).toEqual([
        {
          type: "error",
          path: [],
          error:
            "TypeError: Cannot merge a stream that is already locked to a reader.",
        },
      ]);
    } finally {
      sourceReader.releaseLock();
    }
  });
});

describe("addToolCallPart with an immediate response", () => {
  it("completes the stream without an explicit tool close", async () => {
    const chunks = await collectChunks(
      createAssistantStream((controller) => {
        controller.addToolCallPart({
          toolName: "search",
          response: { result: "done" },
        });
      }),
    );

    expect(chunks.map((c) => c.type)).toContain("result");
    expect(chunks.at(-1)?.type).toBe("part-finish");
  });

  it("completes the stream when args accompany the response", async () => {
    const chunks = await collectChunks(
      createAssistantStream((controller) => {
        controller.addToolCallPart({
          toolName: "search",
          args: { query: "x" },
          response: { result: "done" },
        });
      }),
    );

    const deltas = chunks.filter((c) => c.type === "text-delta");
    expect(deltas.map((c) => c.textDelta).join("")).toBe('{"query":"x"}');
    expect(chunks.filter((c) => c.type === "result")).toHaveLength(1);
    expect(chunks.at(-1)?.type).toBe("part-finish");
  });

  it("keeps working when the caller also closes explicitly", async () => {
    const chunks = await collectChunks(
      createAssistantStream((controller) => {
        const tool = controller.addToolCallPart({
          toolName: "search",
          response: { result: "done" },
        });
        tool.close();
      }),
    );

    expect(chunks.filter((c) => c.type === "result")).toHaveLength(1);
    expect(chunks.filter((c) => c.type === "part-finish")).toHaveLength(1);
    expect(chunks.at(-1)?.type).toBe("part-finish");
  });
});

describe("AssistantStreamController withParentId", () => {
  it("preserves a reasoning summary from addReasoningPart", async () => {
    const stream = createAssistantStream((controller) => {
      const part = controller.addReasoningPart({
        unstable_summary: "Planning",
      });
      part.append("thinking");
      part.close();
    });

    const chunks = await collectChunks(stream);

    expect(chunks).toContainEqual({
      type: "part-start",
      path: [],
      part: {
        type: "reasoning",
        unstable_summary: "Planning",
      },
    });
  });

  it("attaches parentId to text parts across a data-stream round trip", async () => {
    const response = createAssistantStreamResponse((controller) => {
      controller.appendText("intro");
      const group = controller.withParentId("group-1");
      group.appendSource({
        type: "source",
        sourceType: "url",
        id: "s1",
        url: "https://example.com",
        title: "Example",
      });
      group.appendText("grouped text");
    });

    const message = await accumulate(response);
    const intro = message.parts.find(
      (p) => p.type === "text" && p.text === "intro",
    );
    const grouped = message.parts.find(
      (p) => p.type === "text" && p.text === "grouped text",
    );
    const source = message.parts.find((p) => p.type === "source");

    expect(intro?.parentId).toBeUndefined();
    expect(grouped?.parentId).toBe("group-1");
    expect(source?.parentId).toBe("group-1");
  });

  it("attaches parentId to reasoning parts across a data-stream round trip", async () => {
    const response = createAssistantStreamResponse((controller) => {
      controller.appendReasoning("thinking out loud");
      const group = controller.withParentId("group-1");
      group.appendReasoning("grouped reasoning");
    });

    const message = await accumulate(response);
    const ungrouped = message.parts.find(
      (p) => p.type === "reasoning" && p.text === "thinking out loud",
    );
    const grouped = message.parts.find(
      (p) => p.type === "reasoning" && p.text === "grouped reasoning",
    );

    expect(ungrouped?.parentId).toBeUndefined();
    expect(grouped?.parentId).toBe("group-1");
  });

  it("opens a new text part when withParentId switches between ids", async () => {
    const response = createAssistantStreamResponse((controller) => {
      controller.withParentId("group-1").appendText("first");
      controller.withParentId("group-2").appendText("second");
    });

    const message = await accumulate(response);
    const first = message.parts.find(
      (p) => p.type === "text" && p.text === "first",
    );
    const second = message.parts.find(
      (p) => p.type === "text" && p.text === "second",
    );

    expect(first?.parentId).toBe("group-1");
    expect(second?.parentId).toBe("group-2");
  });

  it("attaches parentId on addTextPart called directly inside a withParentId scope", async () => {
    const response = createAssistantStreamResponse((controller) => {
      const part = controller.withParentId("group-1").addTextPart();
      part.append("explicit");
      part.close();
    });

    const message = await accumulate(response);
    const text = message.parts.find(
      (p) => p.type === "text" && p.text === "explicit",
    );

    expect(text?.parentId).toBe("group-1");
  });
});
