"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
} from "assistant-stream/utils";
import { applyWidgetEdits, type WidgetEdit } from "generative-frame/tools";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  chipClass,
  focusComposer,
  glyphFor,
  Icon,
  icons,
  LiveDot,
  radius,
  text,
} from "../components/ui";
import data from "../data.json";

/* -------------------------------------------------------------------------- */
/* What data.json holds: the people, the prompts and the widgets it records.  */
/* -------------------------------------------------------------------------- */

export const ASSISTANT = data.assistant;
export const PERSON = data.person;
export const WELCOME = data.welcome;

/** The prompts of the welcome screen: `{ icon, label, prompt }`. */
export const SUGGESTIONS = data.suggestions;

export type WidgetMeta = {
  /** The widget's name as a person reads it: "Tip splitter". */
  label: string;
  /** An icon name for `glyphFor`. */
  icon: string;
  /** The prompt that makes this widget. */
  prompt: string;
  /** The changes the scripted preview can make to it. */
  changes: readonly string[];
};

const known: Record<string, WidgetMeta> = data.widgets;

/** What the block knows about a widget title; any other title gets a label made from it. */
export function widgetMeta(title: string): WidgetMeta {
  const words = title.replaceAll("_", " ").trim();
  return (
    known[title] ?? {
      label: words ? words.charAt(0).toUpperCase() + words.slice(1) : "Widget",
      icon: "widget",
      prompt: "",
      changes: [],
    }
  );
}

/** A label as it reads in the middle of a sentence: "Tip splitter" gives "tip splitter". */
export const lower = (label: string) =>
  label.charAt(0).toLowerCase() + label.slice(1);

/** Whether `asked`, in lower case, has every word of one of a reply's word groups. */
export const asksFor = (match: readonly (readonly string[])[], asked: string) =>
  match.some((words) => words.every((word) => asked.includes(word)));

const recorded: readonly {
  match: string[][];
  marker?: string;
  tool?: { name: string; args: { title: string } };
}[] = data.replies;

/**
 * The recorded change `prompt` asks for: the widget it edits, and the text
 * the edit adds, which a widget that has the change already holds.
 */
export function recordedChange(
  prompt: string,
): { title: string; marker: string } | undefined {
  const asked = prompt.toLowerCase();
  const reply = recorded.find(
    (entry) =>
      entry.tool?.name === "edit_widget" && asksFor(entry.match, asked),
  );
  return reply?.tool && reply.marker
    ? { title: reply.tool.args.title, marker: reply.marker }
    : undefined;
}

/* -------------------------------------------------------------------------- */
/* The widget tool calls of a thread, read from its messages.                 */
/* -------------------------------------------------------------------------- */

export type WidgetToolName = "show_widget" | "edit_widget";

/**
 * `streaming`: the call is being written or drawn. `ready`: it is drawn.
 * `error`: the tool, an edit or the widget's own script failed. `stopped`:
 * the reply was stopped before the call's arguments had all arrived. A
 * stopped `show_widget` keeps the code it had; a stopped `edit_widget`
 * changes nothing.
 */
export type WidgetStatus = "streaming" | "ready" | "error" | "stopped";

export type WidgetCall = {
  toolCallId: string;
  messageId: string;
  toolName: WidgetToolName;
  /** The widget's id, as the model wrote it: "tip_splitter". Empty until it has arrived. */
  title: string;
  label: string;
  /** An icon name for `glyphFor`. */
  icon: string;
  status: WidgetStatus;
  /** The call's place among the widget calls of the thread, from 0. */
  index: number;
  /** 1 for the call that made the widget, one more for each later call that changed it. */
  version: number;
  /** This call draws the widget as it is now. A call replaced by a later one is not current. */
  current: boolean;
  /** This call made a version of the widget: its code arrived, or its edits fit. A version that failed while it was drawn still counts. */
  applied: boolean;
  /** The lines to show while the call streams, from `loading_messages`. */
  loading: readonly string[];
};

/** One widget: every call on a title, and the one that draws it now. */
export type WidgetEntry = {
  /** The same for as long as the widget is in the chat: a list key, or what a selection holds. */
  id: string;
  title: string;
  label: string;
  icon: string;
  calls: readonly WidgetCall[];
  /** The call to render: the current one, or the newest while nothing has drawn yet. */
  call: WidgetCall;
};

type Snapshot = {
  calls: WidgetCall[];
  signature: string;
  codeByCall: Map<string, string>;
  codeByTitle: Map<string, string>;
  /** The call that draws each title now. */
  current: Map<string, WidgetCall>;
};

const snapshots = new WeakMap<readonly ThreadMessage[], Snapshot>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWidgetTool = (name: string): name is WidgetToolName =>
  name === "show_widget" || name === "edit_widget";

const failed = (result: unknown, isError: boolean | undefined) => {
  if (isError || !isRecord(result) || result["ok"] === false) return true;
  const render = result["render"];
  return isRecord(render) && render["status"] === "rendered" && !render["ok"];
};

/**
 * Replays the widget calls of a thread in order, as the toolkit does: a
 * `show_widget` sets the code of its title and an `edit_widget` edits it. The
 * result is kept for the messages array it was read from.
 */
function readWidgets(messages: readonly ThreadMessage[]): Snapshot {
  const cached = snapshots.get(messages);
  if (cached) return cached;

  const calls: WidgetCall[] = [];
  const codeByCall = new Map<string, string>();
  const codeByTitle = new Map<string, string>();
  const versions = new Map<string, number>();
  const current = new Map<string, WidgetCall>();

  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const running = message.status.type === "running";
    for (const part of message.content) {
      if (part.type !== "tool-call" || !isWidgetTool(part.toolName)) continue;
      const args: Record<string, unknown> = part.args;
      const parsed = getPartialJsonObjectMeta(args);
      // A reply that was stopped leaves a call with the piece of its
      // arguments that had arrived, so "not running" does not mean "whole".
      const whole = part.result !== undefined || parsed?.state === "complete";
      const named =
        whole ||
        (parsed
          ? getPartialJsonObjectFieldState(args, ["title"]) === "complete"
          : !running ||
            "widget_code" in args ||
            "loading_messages" in args ||
            "edits" in args);
      const title =
        named && typeof args["title"] === "string" ? args["title"] : "";

      let code: string | undefined;
      if (part.toolName === "show_widget") {
        if (typeof args["widget_code"] === "string") code = args["widget_code"];
      } else if (whole && Array.isArray(args["edits"])) {
        const before = codeByTitle.get(title);
        const edited =
          before === undefined
            ? undefined
            : applyWidgetEdits(before, args["edits"] as WidgetEdit[]);
        if (edited?.ok) code = edited.code;
      }

      const status: WidgetStatus =
        part.result !== undefined
          ? failed(part.result, part.isError) || code === undefined
            ? "error"
            : "ready"
          : running || message.status.type === "requires-action"
            ? "streaming"
            : whole && code !== undefined
              ? "ready"
              : "stopped";

      const meta = widgetMeta(title);
      const loading = Array.isArray(args["loading_messages"])
        ? args["loading_messages"].filter(
            (line): line is string => typeof line === "string" && line !== "",
          )
        : [];
      const version = (versions.get(title) ?? 0) + 1;
      if (code !== undefined) versions.set(title, version);
      const call: WidgetCall = {
        toolCallId: part.toolCallId,
        messageId: message.id,
        toolName: part.toolName,
        title,
        label: meta.label,
        icon: meta.icon,
        status,
        index: calls.length,
        version,
        current: false,
        applied: code !== undefined,
        loading,
      };
      calls.push(call);

      if (code !== undefined) {
        codeByCall.set(part.toolCallId, code);
        codeByTitle.set(title, code);
        const before = current.get(title);
        if (before) before.current = false;
        call.current = true;
        current.set(title, call);
      }
    }
  }

  const snapshot = {
    calls,
    signature: JSON.stringify(calls),
    codeByCall,
    codeByTitle,
    current,
  };
  snapshots.set(messages, snapshot);
  return snapshot;
}

/**
 * The widget `title` as these messages leave it, for the scripted model: its
 * latest code, and whether that code was stopped part way. Undefined when the
 * messages hold no such widget.
 */
export function readWidget(
  messages: readonly ThreadMessage[],
  title: string,
): { code: string; stopped: boolean } | undefined {
  const snapshot = readWidgets(messages);
  const code = snapshot.codeByTitle.get(title);
  return code === undefined
    ? undefined
    : { code, stopped: snapshot.current.get(title)?.status === "stopped" };
}

/**
 * The widget tool calls of the open chat, in order. The array keeps its
 * identity until a call's title, status or place changes, so it does not
 * change on every streamed chunk.
 */
export function useWidgetCalls(): readonly WidgetCall[] {
  const signature = useAuiState(
    (s) => readWidgets(s.thread.messages).signature,
  );
  return useMemo(() => JSON.parse(signature) as WidgetCall[], [signature]);
}

/** One widget tool call of the open chat, or undefined when it is not there. */
export function useWidgetCall(toolCallId: string): WidgetCall | undefined {
  const calls = useWidgetCalls();
  return calls.find((call) => call.toolCallId === toolCallId);
}

/**
 * The widgets of the open chat, one per title, in the order they were first
 * made. Render `entry.call`: an edit moves it to the call that holds the edit.
 * A call whose title has not arrived is left out, except a widget that is
 * being made: that one is listed as "Widget" until its title is there.
 */
export function useWidgets(): readonly WidgetEntry[] {
  const calls = useWidgetCalls();
  return useMemo(() => {
    const entries = new Map<string, WidgetCall[]>();
    for (const call of calls) {
      if (
        !call.title &&
        (call.toolName === "edit_widget" || call.status !== "streaming")
      )
        continue;
      const key = call.title || call.toolCallId;
      entries.set(key, [...(entries.get(key) ?? []), call]);
    }
    return [...entries.values()].map((group) => {
      const call = group.findLast((entry) => entry.current) ?? group.at(-1)!;
      return {
        id: group[0]!.toolCallId,
        title: call.title,
        label: call.label,
        icon: call.icon,
        calls: group,
        call,
      };
    });
  }, [calls]);
}

/**
 * The source of a widget: by `toolCallId`, the code right after that call;
 * by title, the code as it is now. It grows while a `show_widget` streams and
 * is undefined for an unknown id or an edit that did not apply.
 */
export function useWidgetCode(id: string): string | undefined {
  return useAuiState((s) => {
    const snapshot = readWidgets(s.thread.messages);
    return snapshot.codeByCall.get(id) ?? snapshot.codeByTitle.get(id);
  });
}

/**
 * The recorded changes the widget `title` does not have yet, as prompts to
 * send. Empty for a widget that is not in the chat or is not ready, and for
 * one that has every change the script knows.
 */
export function useOpenChanges(title: string): readonly string[] {
  const list = useAuiState((s) => {
    const snapshot = readWidgets(s.thread.messages);
    const code = snapshot.codeByTitle.get(title);
    if (code === undefined || snapshot.current.get(title)?.status !== "ready")
      return "[]";
    return JSON.stringify(
      widgetMeta(title).changes.filter((prompt) => {
        const change = recordedChange(prompt);
        return !change || !code.includes(change.marker);
      }),
    );
  });
  return useMemo(() => JSON.parse(list) as string[], [list]);
}

/* -------------------------------------------------------------------------- */
/* Placing a widget.                                                          */
/* -------------------------------------------------------------------------- */

/** Whether a message part is a widget tool call, for a `Parts` render function. */
export const isWidgetPart = <Part extends { type: string }>(
  part: Part,
): part is Part & {
  type: "tool-call";
  toolName: WidgetToolName;
  toolCallId: string;
} =>
  part.type === "tool-call" &&
  "toolName" in part &&
  typeof part.toolName === "string" &&
  isWidgetTool(part.toolName);

/**
 * The box a live widget sits in. Inside a `MessagePrimitive.Parts` render
 * function, pass `part.toolUI` as its child to draw the call in the message.
 */
export function WidgetFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("gfc-frame", className)}>{children}</div>;
}

/**
 * Draws one widget tool call anywhere under the runtime provider: a canvas,
 * a board card, a stage. It renders the call's own tool UI inside its own
 * message and part, so the toolkit streams, edits and themes it as it does
 * in the thread.
 *
 * A call's frame must be on screen once at a time. Where an outlet shows a
 * call, the thread's `Parts` render function returns a `<WidgetChip>` (or
 * `<></>`) for it, never `part.toolUI` and never `null`: `null` falls back to
 * the registered tool UI and would draw a second frame.
 *
 * It draws nothing for an `edit_widget` call that was stopped: the tool UI
 * would replay the piece of the edit that had arrived.
 */
export function WidgetOutlet({
  toolCallId,
  className,
}: {
  toolCallId: string;
  className?: string;
}) {
  const call = useWidgetCall(toolCallId);
  const messageId = call?.messageId;
  const renderMessage = useCallback(
    ({ message }: { message: { id: string } }) =>
      message.id === messageId ? (
        <MessagePrimitive.Parts>
          {({ part }) =>
            part.type === "tool-call" && part.toolCallId === toolCallId ? (
              part.toolUI
            ) : (
              <></>
            )
          }
        </MessagePrimitive.Parts>
      ) : null,
    [messageId, toolCallId],
  );
  if (!messageId || isStoppedEdit(call)) return null;

  return (
    <WidgetFrame {...(className ? { className } : {})}>
      <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
    </WidgetFrame>
  );
}

/**
 * An `edit_widget` call the reply was stopped in. It changed nothing, and its
 * tool UI must not be mounted: show a `<WidgetStatusLine>` in its place.
 */
export const isStoppedEdit = (call: WidgetCall | undefined) =>
  call?.toolName === "edit_widget" && call.status === "stopped";

/** What a call is doing, in a few words: for a chip, a card header, a list row. */
export function widgetStatusText(call: WidgetCall): string {
  const edit = call.toolName === "edit_widget";
  switch (call.status) {
    case "streaming":
      return edit ? "Updating" : "Building";
    case "error":
      return edit && !call.applied
        ? "Edit did not apply"
        : "Could not be drawn";
    case "stopped":
      return "Stopped";
    default:
      if (!call.current) return "Earlier version";
      return call.version > 1 ? `Version ${call.version}` : "Ready";
  }
}

/**
 * The line that stands with a widget while it is not ready: the call's
 * loading messages in turn while it streams, then what went wrong, if
 * anything. It renders nothing for a call that is ready.
 */
export function WidgetStatusLine({
  toolCallId,
  dot = true,
  className,
}: {
  toolCallId: string;
  /** `false` leaves the live dot out, where one is already shown beside the line. */
  dot?: boolean;
  className?: string;
}) {
  const call = useWidgetCall(toolCallId);
  const streaming = call?.status === "streaming";
  const lines = call?.loading.length ?? 0;
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (!streaming || lines < 2) return;
    const timer = setInterval(() => setTurn((value) => value + 1), 1400);
    return () => clearInterval(timer);
  }, [streaming, lines]);

  if (!call || call.status === "ready") return null;
  const edit = call.toolName === "edit_widget";
  const name = call.title ? `the ${lower(call.label)}` : "a widget";
  const line = streaming
    ? (call.loading[turn % Math.max(lines, 1)] ??
      (edit ? `Updating ${name}` : `Building ${name}`))
    : call.status === "stopped"
      ? edit
        ? `The change to ${name} was stopped, so nothing changed.`
        : `Stopped before ${name} was finished.`
      : edit && !call.applied
        ? `That change to ${name} did not apply.`
        : `Something in ${name} failed while it was drawn.`;

  return (
    <p
      role="status"
      className={cn(
        "text-muted-foreground flex items-center gap-2",
        text.bodySm,
        className,
      )}
    >
      {streaming ? (
        dot && <LiveDot />
      ) : (
        <Icon {...icons.alert} className="size-3.5" />
      )}
      <span className={streaming ? "shimmer motion-reduce:animate-none" : ""}>
        {line}
      </span>
    </p>
  );
}

/**
 * A widget call as one compact row: its icon, its name and what it is doing.
 * It stands for the call in the thread when the live frame is shown somewhere
 * else, or when a later call replaced it. With `onOpen` it is a button.
 */
export function WidgetChip({
  toolCallId,
  onOpen,
  label,
  active,
  className,
}: {
  toolCallId: string;
  onOpen?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** What the button does, when the name and the status do not say it. Sets `aria-label`. */
  label?: string;
  /** The call this chip stands for is the one on show. Sets `aria-pressed`. */
  active?: boolean;
  className?: string;
}) {
  const call = useWidgetCall(toolCallId);
  if (!call) return null;

  const body = (
    <>
      <Icon {...glyphFor(call.icon)} className="text-muted-foreground" />
      <span className="min-w-0 truncate">{call.label}</span>
      <span className="text-muted-foreground flex shrink-0 items-center gap-1.5">
        {call.status === "streaming" && <LiveDot />}
        {widgetStatusText(call)}
      </span>
    </>
  );

  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      {...(label ? { "aria-label": label } : {})}
      {...(active === undefined ? {} : { "aria-pressed": active })}
      className={cn(chipClass, "aria-pressed:bg-accent w-fit", className)}
    >
      {body}
    </button>
  ) : (
    <div
      className={cn(
        chipClass,
        "hover:bg-card w-fit active:scale-100",
        className,
      )}
    >
      {body}
    </div>
  );
}

/** The source of a widget, by `toolCallId` or by title, as it is in the thread. */
export function WidgetCode({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const code = useWidgetCode(id);
  if (code === undefined) return null;

  return (
    <pre
      role="region"
      tabIndex={0}
      aria-label="Widget source"
      className={cn(
        "gfc-code focus-visible:border-ring border border-transparent outline-none",
        radius.sm,
        className,
      )}
    >
      <code>{code}</code>
    </pre>
  );
}

/* -------------------------------------------------------------------------- */
/* What a layout asks the thread to do.                                       */
/* -------------------------------------------------------------------------- */

/** Sends `prompt` as the next message. It does nothing while a reply is being written. */
export function useSendPrompt() {
  const aui = useAui();
  return useCallback(
    (prompt: string) => {
      if (aui.thread.getState().isRunning) return;
      aui.thread.append(prompt);
    },
    [aui],
  );
}

/** Opens a new chat and moves the focus to the composer. */
export function useNewChat() {
  const aui = useAui();
  return useCallback(() => {
    void aui.threads.switchToNewThread();
    focusComposer();
  }, [aui]);
}

/**
 * Starts a request to change a widget: writes "Change the tip splitter: " in
 * the composer and moves the focus there, for the person to finish and send.
 */
export function useAskForChange() {
  const aui = useAui();
  return useCallback(
    (title: string) => {
      aui.thread
        .composer()
        .setText(`Change the ${lower(widgetMeta(title).label)}: `);
      focusComposer();
    },
    [aui],
  );
}

/**
 * The prompts to offer after the newest reply, from the reply itself. Empty
 * while the chat is empty or a reply is being written. Render each with
 * `<ThreadPrimitive.Suggestion prompt={prompt} send>`.
 */
export function useFollowUps(): readonly string[] {
  const list = useAuiState((s) => {
    if (s.thread.isRunning) return "[]";
    const last = s.thread.messages.at(-1);
    const followUps =
      last?.role === "assistant"
        ? last.metadata.custom["followUps"]
        : undefined;
    return Array.isArray(followUps) ? JSON.stringify(followUps) : "[]";
  });
  return useMemo(() => JSON.parse(list) as string[], [list]);
}
