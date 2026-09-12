import type { ThreadMessage } from "@assistant-ui/react";
import type { ConversationMapEntry } from "./conversation-map";

const TITLE_LENGTH = 72;
const PREVIEW_LENGTH = 240;

export type ConversationMapTurn = {
  head: ThreadMessage;
  members: ThreadMessage[];
};

type ProjectedTurn = ConversationMapTurn & {
  rawStart: number;
  rawEnd: number;
};

type MessageSummary = {
  text: string;
  lines: string[];
  label: string;
};

export type ConversationMapProjection = {
  messages: readonly ThreadMessage[];
  turns: readonly ConversationMapTurn[];
  entries: readonly ConversationMapEntry[];
  turnOf: ReadonlyMap<string, string>;
  turnKey: string;
};

type CachedProjection = Omit<ConversationMapProjection, "turns" | "turnOf"> & {
  turns: readonly ProjectedTurn[];
  turnOf: Map<string, string>;
  turnKeyEnds: readonly number[];
};

const cutAtWord = (text: string, limit: number) => {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const boundary = head.lastIndexOf(" ");
  return boundary > limit / 2 ? head.slice(0, boundary) : head;
};

const summarizeMessage = (message: ThreadMessage): MessageSummary => {
  const content = message.content;
  const textParts: string[] = [];
  const tools: string[] = [];
  let hasReasoning = false;
  let hasImage = false;
  let hasFile = false;

  for (const part of content) {
    switch (part.type) {
      case "text":
        textParts.push(part.text);
        break;
      case "tool-call":
        tools.push(part.toolName);
        break;
      case "reasoning":
        hasReasoning = true;
        break;
      case "image":
        hasImage = true;
        break;
      case "file":
        hasFile = true;
        break;
    }
  }

  const attachments = message.attachments ?? [];
  for (const attachment of attachments) {
    if (attachment.type === "image") hasImage = true;
    if (attachment.type === "file") hasFile = true;
  }

  const text = textParts.join("\n").trim();
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s#>*`-]+/, "").trim())
    .filter(Boolean);

  let label: string;
  if (tools.length === 1) label = tools[0]!;
  else if (tools.length > 1) label = `${tools.length} tool calls`;
  else if (hasReasoning) label = "Reasoning";
  else if (hasImage) label = "Image";
  else if (hasFile) label = "File";
  else if (content.length + attachments.length > 0) label = "Attachment";
  else label = message.role === "user" ? "Message" : "Response";

  return { text, lines, label };
};

const groupIntoTurns = (
  messages: readonly ThreadMessage[],
  start = 0,
): ProjectedTurn[] => {
  const turns: ProjectedTurn[] = [];

  for (let index = start; index < messages.length; index++) {
    const message = messages[index]!;
    if (message.role !== "user" && message.role !== "assistant") {
      const current = turns.at(-1);
      if (current) current.rawEnd = index + 1;
      continue;
    }

    const current = turns.at(-1);
    if (message.role === "user" || !current) {
      turns.push({
        head: message,
        members: [message],
        rawStart: index,
        rawEnd: index + 1,
      });
      continue;
    }
    current.members.push(message);
    current.rawEnd = index + 1;
  }

  return turns;
};

export class ConversationMapProjectionCache {
  private readonly summaries = new WeakMap<ThreadMessage, MessageSummary>();
  private previous: CachedProjection | undefined;

  private summaryOf(message: ThreadMessage) {
    let summary = this.summaries.get(message);
    if (!summary) {
      summary = summarizeMessage(message);
      this.summaries.set(message, summary);
    }
    return summary;
  }

  private describe({ head, members }: ConversationMapTurn) {
    const headSummary = this.summaryOf(head);
    const first = headSummary.lines[0] ?? "";
    const title = cutAtWord(first, TITLE_LENGTH);

    let answerSummary: MessageSummary | undefined;
    for (const member of members) {
      if (member === head) continue;
      const summary = this.summaryOf(member);
      if (summary.text) {
        answerSummary = summary;
        break;
      }
    }

    const preview = (
      answerSummary
        ? answerSummary.lines.join(" ")
        : [first.slice(title.length), ...headSummary.lines.slice(1)].join(" ")
    )
      .trim()
      .slice(0, PREVIEW_LENGTH);

    return {
      id: head.id,
      title: title || headSummary.label,
      ...(preview ? { preview } : {}),
    };
  }

  private initial(messages: readonly ThreadMessage[]): CachedProjection {
    const turns = groupIntoTurns(messages);
    const entries = turns.map((turn) => this.describe(turn));
    const turnOf = new Map<string, string>();
    for (const turn of turns) {
      for (const member of turn.members) turnOf.set(member.id, turn.head.id);
    }

    const turnKeyParts = turns.map((turn) => turn.head.id);
    return {
      messages,
      turns,
      entries,
      turnOf,
      turnKey: turnKeyParts.join(" "),
      turnKeyEnds: turnKeyParts.reduce<number[]>((ends, id, index) => {
        const previousEnd = ends[index - 1] ?? 0;
        ends.push(previousEnd + (index === 0 ? 0 : 1) + id.length);
        return ends;
      }, []),
    };
  }

  project(messages: readonly ThreadMessage[]): ConversationMapProjection {
    const previous = this.previous;
    if (!previous) {
      const initial = this.initial(messages);
      this.previous = initial;
      return initial;
    }
    if (messages === previous.messages) return previous;

    let changedAt = 0;
    while (
      changedAt < previous.messages.length &&
      changedAt < messages.length &&
      previous.messages[changedAt] === messages[changedAt]
    ) {
      changedAt++;
    }
    if (
      changedAt === previous.messages.length &&
      changedAt === messages.length
    ) {
      return (this.previous = { ...previous, messages });
    }

    let affectedTurnIndex: number;
    let rebuildStart: number;
    if (changedAt >= previous.messages.length) {
      affectedTurnIndex = Math.max(0, previous.turns.length - 1);
      rebuildStart = previous.turns.at(-1)?.rawStart ?? changedAt;
    } else {
      affectedTurnIndex = previous.turns.findIndex(
        (turn) => changedAt >= turn.rawStart && changedAt < turn.rawEnd,
      );
      if (affectedTurnIndex === -1) {
        if (
          previous.messages.length === messages.length &&
          previous.messages.every((message, index) => {
            const next = messages[index]!;
            return (
              message === next ||
              (message.role !== "user" &&
                message.role !== "assistant" &&
                next.role !== "user" &&
                next.role !== "assistant")
            );
          })
        ) {
          return (this.previous = { ...previous, messages });
        }
        affectedTurnIndex = 0;
        rebuildStart = 0;
      } else {
        rebuildStart = previous.turns[affectedTurnIndex]!.rawStart;
      }
    }

    if (
      affectedTurnIndex > 0 &&
      changedAt === previous.turns[affectedTurnIndex]!.rawStart
    ) {
      affectedTurnIndex--;
      rebuildStart = previous.turns[affectedTurnIndex]!.rawStart;
    }

    const oldSuffix = previous.turns.slice(affectedTurnIndex);
    const suffix = groupIntoTurns(messages, rebuildStart);
    const turns = [...previous.turns.slice(0, affectedTurnIndex), ...suffix];
    const entries = [
      ...previous.entries.slice(0, affectedTurnIndex),
      ...suffix.map((turn) => this.describe(turn)),
    ];
    const sameOwnership =
      oldSuffix.length === suffix.length &&
      suffix.every((turn, index) => {
        const old = oldSuffix[index]!;
        return (
          turn.head.id === old.head.id &&
          turn.members.length === old.members.length &&
          turn.members.every(
            (member, index) => member.id === old.members[index]!.id,
          )
        );
      });
    const turnOf = sameOwnership ? previous.turnOf : new Map<string, string>();
    if (!sameOwnership) {
      for (const turn of turns) {
        for (const member of turn.members) turnOf.set(member.id, turn.head.id);
      }
    }

    const suffixKey = suffix.map((turn) => turn.head.id).join(" ");
    const prefixEnd = previous.turnKeyEnds[affectedTurnIndex - 1] ?? 0;
    const prefixKey = previous.turnKey.slice(0, prefixEnd);
    const turnKey = prefixKey
      ? suffixKey
        ? `${prefixKey} ${suffixKey}`
        : prefixKey
      : suffixKey;
    const turnKeyEnds = previous.turnKeyEnds.slice(0, affectedTurnIndex);
    let keyEnd = prefixKey.length;
    for (const turn of suffix) {
      keyEnd += (keyEnd === 0 ? 0 : 1) + turn.head.id.length;
      turnKeyEnds.push(keyEnd);
    }

    const projection: CachedProjection = {
      messages,
      turns,
      entries,
      turnOf,
      turnKey,
      turnKeyEnds,
    };
    this.previous = projection;
    return projection;
  }
}
