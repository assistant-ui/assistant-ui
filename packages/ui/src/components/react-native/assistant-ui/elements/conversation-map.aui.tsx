import { cn } from "@/lib/utils";
import { type ThreadMessage, useAuiState } from "@assistant-ui/react-native";
import { type FC, useMemo } from "react";
import { View } from "react-native";
import { ConversationMap, type ConversationMapEntry } from "./conversation-map";
import { useThreadViewport } from "./thread.aui";

const TITLE_LENGTH = 72;
const PREVIEW_LENGTH = 240;

type MessageSummary = {
  hasText: boolean;
  title: string;
  answerPreview: string;
  questionPreview: string;
};

/** Cuts on a word boundary so a title never splits a word. */
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

  // A composer submission carries its files in `attachments` and leaves
  // `content` empty, so both places decide an attachment-only turn's label.
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

  const first = lines[0] ?? "";
  const title = cutAtWord(first, TITLE_LENGTH);
  return {
    hasText: text.length > 0,
    title: title || label,
    answerPreview: lines.join(" ").trim().slice(0, PREVIEW_LENGTH),
    questionPreview: [first.slice(title.length), ...lines.slice(1)]
      .join(" ")
      .trim()
      .slice(0, PREVIEW_LENGTH),
  };
};

const summaries = new WeakMap<ThreadMessage, MessageSummary>();

const summaryOf = (message: ThreadMessage) => {
  let summary = summaries.get(message);
  if (!summary) {
    summary = summarizeMessage(message);
    summaries.set(message, summary);
  }
  return summary;
};

/** A user message and the assistant messages answering it. */
type Turn = {
  head: ThreadMessage;
  members: ThreadMessage[];
};

const groupIntoTurns = (messages: readonly ThreadMessage[]) => {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const current = turns.at(-1);
    if (message.role === "user" || !current) {
      turns.push({ head: message, members: [message] });
    } else {
      current.members.push(message);
    }
  }
  return turns;
};

const describe = ({ head, members }: Turn): ConversationMapEntry => {
  const headSummary = summaryOf(head);

  // What the turn asked names it; what it answered is the useful preview, and
  // a turn still being answered falls back to the rest of its own text.
  const answer = members.find(
    (member) => member !== head && summaryOf(member).hasText,
  );
  const preview = answer
    ? summaryOf(answer).answerPreview
    : headSummary.questionPreview;

  return {
    id: head.id,
    title: headSummary.title,
    ...(preview ? { preview } : {}),
  };
};

export interface ConversationMapAuiProps {
  className?: string;
}

/**
 * The rail in the gutter the thread keeps along its message list; mount it
 * through the thread's `Rail` slot so it can read the list through
 * `useThreadViewport`.
 */
export const ConversationMapAui: FC<ConversationMapAuiProps> = ({
  className,
}) => {
  const messages = useAuiState((s) => s.thread.messages);
  const { visibleMessageIds, descent, height, top, scrollToMessage } =
    useThreadViewport();

  const turns = useMemo(() => groupIntoTurns(messages), [messages]);
  const entries = useMemo(() => turns.map(describe), [turns]);

  /** Which turn each message belongs to, so a message on screen marks its turn. */
  const turnOf = useMemo(() => {
    const owners = new Map<string, string>();
    for (const turn of turns) {
      for (const member of turn.members) owners.set(member.id, turn.head.id);
    }
    return owners;
  }, [turns]);

  const visibleIds: string[] = [];
  for (const id of visibleMessageIds) {
    const head = turnOf.get(id);
    if (head !== undefined && !visibleIds.includes(head)) visibleIds.push(head);
  }

  // The reading line slides from the top of the viewport to its bottom over
  // the final screenful, so the last turns can be the ones being read.
  const activeId =
    visibleIds[Math.round(descent * (visibleIds.length - 1))] ?? entries[0]?.id;

  if (entries.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className={cn(
        "aui-conversation-map-rail absolute left-0 px-1 py-10",
        className,
      )}
      style={{ top, height }}
    >
      <ConversationMap
        entries={entries}
        activeId={activeId}
        visibleIds={visibleIds}
        onSelect={scrollToMessage}
        side="right"
      />
    </View>
  );
};
