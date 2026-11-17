"use client";

import {
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ToolCallMessagePart,
} from "@assistant-ui/react";
// The preview runs the example's own UI, toolkit, and script, so it cannot
// drift from the app it documents. Only the runtime differs: the app streams
// from its route, and this page has no route to call.
import { SupportDesk } from "../../../../../examples/with-human-in-the-loop/app/support-desk";
import {
  findOrder,
  issueRefund,
  refundParameters,
} from "../../../../../examples/with-human-in-the-loop/lib/orders";
import { refundApproval } from "../../../../../examples/with-human-in-the-loop/lib/refund-policy";
import {
  nextStep,
  type ScriptEvent,
} from "../../../../../examples/with-human-in-the-loop/lib/script";

type ToolCall = ToolCallMessagePart;

const HUMAN_TOOLS = ["select_items"];

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

const toEvent = (call: ToolCall): ScriptEvent => ({
  type: "tool",
  toolName: call.toolName,
  input: call.args,
  output: call.result,
  ...(call.approval?.approved === false && { denied: true }),
});

const toHistory = (messages: readonly ThreadMessage[]): ScriptEvent[] =>
  messages.flatMap((message): ScriptEvent[] => {
    if (message.role === "user") {
      const text = message.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join(" ");
      return [{ type: "user", text }];
    }
    if (message.role !== "assistant") return [];
    return message.content.flatMap((part) =>
      part.type === "tool-call" && part.result !== undefined
        ? [toEvent(part)]
        : [],
    );
  });

const refund = (call: ToolCall) => {
  const request = refundParameters.safeParse(call.args);
  return request.success
    ? issueRefund(request.data)
    : { error: "The refund request was incomplete." };
};

const scriptedAgent: ChatModelAdapter = {
  async *run({ messages, abortSignal, unstable_getMessage }) {
    const paused = unstable_getMessage();
    const history = toHistory([...messages, paused]);
    const content: ThreadAssistantMessagePart[] = [];

    const settle = (call: ToolCall) => {
      content.push(call);
      history.push(toEvent(call));
    };

    for (const part of paused.content) {
      if (
        part.type === "tool-call" &&
        part.approval?.approved === true &&
        part.result === undefined
      ) {
        settle({ ...part, result: refund(part) });
      }
    }
    if (content.length > 0) yield { content: [...content] };

    while (!abortSignal.aborted) {
      const step = nextStep(history);

      if (step.text) {
        let text = "";
        for (const word of step.text.split(/(?<=\s)/)) {
          await pause(25, abortSignal);
          if (abortSignal.aborted) return;
          text += word;
          yield { content: [...content, { type: "text", text }] };
        }
        content.push({ type: "text", text });
      }

      if (!step.call) return;

      const call: ToolCall = {
        type: "tool-call",
        toolCallId: `call_${crypto.randomUUID()}`,
        toolName: step.call.toolName,
        args: step.call.input as ToolCall["args"],
        argsText: JSON.stringify(step.call.input),
      };

      if (step.call.toolName === "select_items") {
        yield {
          content: [...content, call],
          status: { type: "requires-action", reason: "tool-calls" },
        };
        return;
      }

      if (step.call.toolName === "find_order") {
        yield { content: [...content, call] };
        await pause(400, abortSignal);
        if (abortSignal.aborted) return;
        settle({ ...call, result: findOrder(String(call.args["orderId"])) });
        yield { content: [...content] };
        continue;
      }

      const policy = refundApproval(call.args);
      if (typeof policy === "object" && policy.type === "user-approval") {
        const approval = {
          id: call.toolCallId,
          ...(policy.reason && { prompt: policy.reason }),
        };
        yield {
          content: [...content, { ...call, approval }],
          status: { type: "requires-action", reason: "tool-calls" },
        };
        return;
      }

      yield { content: [...content, call] };
      await pause(400, abortSignal);
      if (abortSignal.aborted) return;
      settle({
        ...call,
        ...(typeof policy === "object" &&
          policy.type === "approved" && {
            approval: {
              id: call.toolCallId,
              approved: true,
              isAutomatic: true,
              ...(policy.reason && { reason: policy.reason }),
            },
          }),
        result: refund(call),
      });
      yield { content: [...content] };
    }
  },
};

export function HumanInTheLoop() {
  const runtime = useLocalRuntime(scriptedAgent, {
    unstable_humanToolNames: HUMAN_TOOLS,
  });

  return <SupportDesk runtime={runtime} model="Scripted model" />;
}
