import { useCallback, useInsertionEffect, useRef, useState } from "react";

/** What a rendered UI tells the model about the user's choices: words, data, or both. */
export type SharedContext = { text?: string; data?: unknown };

type InteractionLog = {
  readonly entries: readonly {
    readonly type: string;
    readonly payload: unknown;
  }[];
};

type RecordInteraction = (input: {
  type: "action";
  payload: Record<string, unknown>;
}) => Promise<void> | void;

const MAX_INSTRUCTION = 4000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringify = (value: unknown) => {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
};

/** A context from loose input, or undefined when it carries neither text nor data, which clears what the UI shared. */
export function toSharedContext(
  text: unknown,
  data: unknown,
): SharedContext | undefined {
  const context: SharedContext = {};
  if (typeof text === "string" && text.trim()) context.text = text.trim();
  if (data !== undefined && data !== null) context.data = data;
  return context.text !== undefined || context.data !== undefined
    ? context
    : undefined;
}

/** The context in MCP Apps `ui/update-model-context` params: the text blocks of `content`, and `structuredContent` as data. */
export function frameContext(params: unknown): SharedContext | undefined {
  if (!isRecord(params)) return undefined;
  const blocks = Array.isArray(params["content"]) ? params["content"] : [];
  const text = blocks
    .flatMap((block) =>
      isRecord(block) &&
      block["type"] === "text" &&
      typeof block["text"] === "string"
        ? [block["text"]]
        : [],
    )
    .join("\n");
  return toSharedContext(text, params["structuredContent"]);
}

/** The newest context recorded on a call; a recorded `null` means the UI cleared it. */
export function savedContext(
  log: InteractionLog | undefined,
  toolCallId: string,
): SharedContext | undefined {
  const entries = log?.entries ?? [];
  for (let index = entries.length - 1; index >= 0; index--) {
    const { type, payload } = entries[index]!;
    if (
      type !== "action" ||
      !isRecord(payload) ||
      payload["type"] !== "modelContext" ||
      payload["toolCallId"] !== toolCallId
    ) {
      continue;
    }
    const context = payload["context"];
    return isRecord(context)
      ? toSharedContext(context["text"], context["data"])
      : undefined;
  }
  return undefined;
}

/** The system prompt line for what a UI shares, capped so one UI cannot crowd out the rest of the prompt. */
export function contextInstruction(
  title: string,
  context: SharedContext,
): string {
  const parts = [`The user's choices in the UI "${title}", as they stand now:`];
  if (context.text) parts.push(context.text);
  const data = context.data === undefined ? "" : stringify(context.data);
  if (data) parts.push(data);
  const text = parts.join(" ");
  return text.length > MAX_INSTRUCTION
    ? `${text.slice(0, MAX_INSTRUCTION - 1)}…`
    : text;
}

/**
 * What a mounted tool call shares with the model: restored from the call's
 * interactions, replaced by the returned function, recorded so it survives a
 * reload, and passed to `useInstruction` for every later request.
 */
export function useSharedContext({
  title,
  toolCallId,
  interactions,
  record,
  useInstruction,
}: {
  title: string;
  toolCallId: string;
  interactions: InteractionLog | undefined;
  record: RecordInteraction | undefined;
  useInstruction: (instruction: string | undefined) => void;
}): (context: SharedContext | undefined) => void {
  const [context, setContext] = useState(() =>
    savedContext(interactions, toolCallId),
  );
  const recordRef = useRef(record);
  useInsertionEffect(() => {
    recordRef.current = record;
  });
  useInstruction(
    context ? contextInstruction(title || toolCallId, context) : undefined,
  );
  return useCallback(
    (next: SharedContext | undefined) => {
      setContext(next);
      void Promise.resolve(
        recordRef.current?.({
          type: "action",
          payload: { type: "modelContext", toolCallId, context: next ?? null },
        }),
      ).catch(() => undefined);
    },
    [toolCallId],
  );
}
