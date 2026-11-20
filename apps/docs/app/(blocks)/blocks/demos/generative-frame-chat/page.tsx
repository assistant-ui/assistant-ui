"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  InMemoryThreadListAdapter,
  Tools,
  useAui,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type ThreadMessage,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { parsePartialJsonObject } from "assistant-stream/utils";
import {
  createWidgetToolkit,
  useWidgetInstructions,
} from "generative-frame/assistant-ui";
import type { WidgetEdit } from "generative-frame/tools";
import { useEffect, useMemo } from "react";
import { focusComposer } from "./components/ui";
import data from "./data.json";
import { GenerativeFrameChat } from "./generative-frame-chat";
import {
  asksFor,
  lower,
  readWidget,
  recordedChange,
  widgetMeta,
} from "./lib/widgets";

/* -------------------------------------------------------------------------- */
/* The widget toolkit: the tools a model calls, and what draws their calls.   */
/* -------------------------------------------------------------------------- */

/** Where a widget's `sendPrompt(text)` goes: set under the runtime provider. */
const promptTarget: { current: ((prompt: string) => void) | null } = {
  current: null,
};

/**
 * `show_widget` and `edit_widget` render as live frames, and their results
 * wait for the frame, so a model hears about a widget that failed to draw.
 * The frames read the block's theme from the page and follow light and dark.
 * A frame clips at its edge, so it is padded for the focus ring of a control
 * that sits there; `.gfc-frame` takes the same 4px back.
 */
const widgets = createWidgetToolkit({
  widget: {
    maxHeight: 820,
    css: "#gf-root{padding:4px}",
    onPrompt: (prompt) => promptTarget.current?.(prompt),
  },
  renderReport: { timeoutMs: 6000 },
});

const config = AuiConfig({ tools: Tools({ toolkit: widgets.toolkit }) });

/**
 * Adds the widget instructions to the system prompt a model would get, and
 * puts a widget's prompt in the composer, after any draft, with the focus.
 */
function WidgetBridge() {
  const aui = useAui();
  useWidgetInstructions(widgets.tools);
  useEffect(() => {
    promptTarget.current = (prompt) => {
      const composer = aui.thread.composer();
      composer.setText(
        [composer.getState().text, prompt]
          .filter((part) => part.trim())
          .join(" "),
      );
      focusComposer();
    };
    return () => {
      promptTarget.current = null;
    };
  }, [aui]);
  return null;
}

/* -------------------------------------------------------------------------- */
/* The scripted model: the preview runs without a key or a server.            */
/*                                                                            */
/* It answers from data.json and makes the same tool calls a model would, a   */
/* few characters at a time, so a widget really builds up in its frame. To    */
/* talk to a model, replace `useScriptedRuntime()` with `useChatRuntime`.     */
/* -------------------------------------------------------------------------- */

type ToolCall =
  | {
      name: "show_widget";
      args: { title: string; loading_messages: string[]; widget_code: string };
    }
  | { name: "edit_widget"; args: { title: string; edits: WidgetEdit[] } };

type Reply = {
  /** Groups of words: the reply answers a message that has every word of one group. */
  match: string[][];
  text: string;
  tool?: ToolCall;
  /** Text an edit adds: a widget that has it already has the change. */
  marker?: string;
  /** What to say once the tool has answered. */
  after?: string;
  followUps: readonly string[];
};

type EditReply = Reply & { tool: Extract<ToolCall, { name: "edit_widget" }> };

const script = data.script;
const replies = data.replies as readonly Reply[];

const isEdit = (reply: Reply): reply is EditReply =>
  reply.tool?.name === "edit_widget";

const textIn = (message: ThreadMessage | undefined) =>
  (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");

/**
 * Picks the reply for a message from the replies in data.json. An edit
 * answers only when its widget is in the chat and is the one the message
 * names; otherwise the first plain answer or widget that matches does.
 */
function planReply(messages: readonly ThreadMessage[]): Reply {
  const asked = textIn(
    messages.findLast((entry) => entry.role === "user"),
  ).toLowerCase();
  const say = (line: string, title: string, followUps: readonly string[]) => ({
    match: [],
    text: line.replace("{widget}", lower(widgetMeta(title).label)),
    followUps,
  });
  const matches = replies.filter((entry) => asksFor(entry.match, asked));
  const named = Object.keys(data.widgets).find((title) =>
    asked.includes(widgetMeta(title).label.toLowerCase()),
  );
  const edits = matches
    .filter(isEdit)
    .filter((entry) => !named || entry.tool.args.title === named);

  const present = edits.flatMap((edit) => {
    const widget = readWidget(messages, edit.tool.args.title);
    if (!widget) return [];
    const applied = !!edit.marker && widget.code.includes(edit.marker);
    return [{ edit, widget, applied }];
  });
  const pick = present.find((entry) => !entry.applied) ?? present[0];
  if (pick) {
    const { title } = pick.edit.tool.args;
    if (pick.widget.stopped)
      return say(script.stopped, title, [widgetMeta(title).prompt]);
    return pick.applied
      ? say(script.applied, title, pick.edit.followUps)
      : pick.edit;
  }

  // "Change the tip splitter: …" with a change the script has not recorded.
  if (named && /^\s*change\b/.test(asked)) {
    const { changes, prompt } = widgetMeta(named);
    const widget = readWidget(messages, named);
    if (!widget) return say(script.missing, named, [prompt]);
    if (widget.stopped) return say(script.stopped, named, [prompt]);
    return changes.length > 0
      ? say(script.unknownChange, named, changes)
      : say(script.noChanges, named, []);
  }

  const answer = matches.find((entry) => !isEdit(entry));
  if (answer) return answer;
  if (edits[0]) {
    const { title } = edits[0].tool.args;
    return say(script.missing, title, [widgetMeta(title).prompt]);
  }
  return {
    match: [],
    text: script.fallback,
    followUps: data.suggestions.map((suggestion) => suggestion.prompt),
  };
}

/**
 * The follow-ups that still lead somewhere: one that asks for a change is
 * dropped when the widget is not in these messages or already has the change.
 */
const openFollowUps = (
  prompts: readonly string[],
  messages: readonly ThreadMessage[],
) =>
  prompts.filter((prompt) => {
    const change = recordedChange(prompt);
    if (!change) return true;
    const widget = readWidget(messages, change.title);
    return !!widget && !widget.stopped && !widget.code.includes(change.marker);
  });

/**
 * Why a widget tool call failed, in words, or undefined when it did not. The
 * tool's own error is written for a model, so it is not what a person reads.
 */
function failure(toolName: string, result: unknown): string | undefined {
  if (typeof result !== "object" || result === null) return undefined;
  if ("ok" in result && result.ok === false) {
    return toolName === "edit_widget"
      ? "the change did not fit the widget's code."
      : "the widget tool turned the code down.";
  }
  const render = "render" in result ? result.render : undefined;
  return typeof render === "object" &&
    render !== null &&
    "status" in render &&
    render.status === "rendered" &&
    "ok" in render &&
    render.ok === false
    ? "the widget reported an error while it was drawn."
    : undefined;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How fast the script types. Reduced motion streams in larger pieces, sooner. */
const readPace = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? { think: 100, word: 4, chunk: 240, tick: 8, pause: 120 }
    : { think: 350, word: 22, chunk: 24, tick: 12, pause: 500 };

const STEP = { steps: [{}] };

/**
 * A `ChatModelAdapter` that plays a reply in two steps, as a model does.
 * The first writes the opening line and streams the tool call, runs the
 * tool the toolkit registered, and stops for the result. The runtime then
 * calls it again, and the second step writes the closing line.
 */
const scriptedModel: ChatModelAdapter = {
  async *run({ messages, abortSignal, context, unstable_getMessage }) {
    const pace = readPace();
    const reply = planReply(messages);
    const answered = unstable_getMessage().content.findLast(
      (part) => part.type === "tool-call",
    );

    async function* type(line: string): AsyncGenerator<string> {
      let said = "";
      for (const word of line.split(/(?<=\s)/)) {
        if (abortSignal.aborted) return;
        said += word;
        yield said;
        await wait(pace.word);
      }
    }
    const text = (said: string) => ({ type: "text" as const, text: said });

    if (answered?.result !== undefined) {
      const error = failure(answered.toolName, answered.result);
      const closing = error
        ? script.failed.replace("{error}", error)
        : (reply.after ?? "");
      for await (const said of type(closing)) yield { content: [text(said)] };
      yield {
        content: [text(closing)],
        metadata: {
          custom: {
            followUps: error
              ? []
              : openFollowUps(reply.followUps, [
                  ...messages,
                  unstable_getMessage(),
                ]),
          },
          ...STEP,
        },
      };
      return;
    }

    await wait(pace.think);
    for await (const said of type(reply.text)) yield { content: [text(said)] };
    const { tool } = reply;
    if (!tool) {
      yield {
        content: [text(reply.text)],
        metadata: {
          custom: { followUps: openFollowUps(reply.followUps, messages) },
          ...STEP,
        },
      };
      return;
    }

    const toolCallId = `call-${crypto.randomUUID()}`;
    const argsText = JSON.stringify(tool.args);
    // The toolkit replays the edits of a call that was stopped part way, so
    // an `edit_widget` call gets its edits in one piece, once they are whole.
    const held =
      tool.name === "edit_widget"
        ? argsText.indexOf('"edits":')
        : argsText.length;
    const content = (
      length: number,
      result?: unknown,
    ): ChatModelRunResult["content"] => {
      const written = argsText.slice(
        0,
        length < argsText.length ? Math.min(length, held) : length,
      );
      return [
        text(reply.text),
        {
          type: "tool-call",
          toolCallId,
          toolName: tool.name,
          argsText: written,
          args: parsePartialJsonObject(written) ?? {},
          ...(result !== undefined && { result }),
        },
      ];
    };

    // A model is slow to start the code, which is when the loading line shows.
    const codeStart = argsText.indexOf('"widget_code":"');
    for (let length = pace.chunk; length < argsText.length;) {
      if (abortSignal.aborted) return;
      yield { content: content(length) };
      const next = length + pace.chunk;
      await wait(
        length <= codeStart && codeStart < next ? pace.pause : pace.tick,
      );
      length = next;
    }
    if (abortSignal.aborted) return;
    yield { content: content(argsText.length) };

    // `edit_widget` edits the registry's copy, which a chat that was open
    // before this one may have left holding another chat's widget.
    if (tool.name === "edit_widget") {
      const code = readWidget(messages, tool.args.title)?.code;
      if (
        code !== undefined &&
        widgets.registry.get(tool.args.title)?.code !== code
      )
        widgets.registry.set(tool.args.title, code);
    }
    const execute = context.tools?.[tool.name]?.execute;
    const result: unknown = execute
      ? await Promise.resolve(
          execute(tool.args, {
            toolCallId,
            abortSignal,
            human: async () => {
              throw new Error("The scripted preview has no one to ask.");
            },
          }),
        ).catch((error: unknown) => ({ ok: false, error: String(error) }))
      : { ok: false, error: "the widget tools are not registered." };

    yield {
      content: content(argsText.length, result),
      status: { type: "requires-action", reason: "tool-calls" },
      metadata: STEP,
    };
  },
};

/* -------------------------------------------------------------------------- */
/* The runtime: a list of chats, each answered by the scripted model.         */
/* -------------------------------------------------------------------------- */

/** The chats of one visit, kept in memory and named after their first message. */
class Chats extends InMemoryThreadListAdapter {
  override async generateTitle(
    _remoteId?: string,
    messages: readonly ThreadMessage[] = [],
  ) {
    const title = textIn(messages.find((entry) => entry.role === "user"));
    return createAssistantStream((controller) => {
      controller.appendText(title.trim().slice(0, 60) || "New chat");
    });
  }
}

function useScriptedRuntime() {
  const adapter = useMemo(() => new Chats(), []);
  return useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function RuntimeHook() {
      return useLocalRuntime(scriptedModel, { maxSteps: 3 });
    },
  });
}

export default function Page() {
  const runtime = useScriptedRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <WidgetBridge />
      <GenerativeFrameChat />
    </AssistantRuntimeProvider>
  );
}
