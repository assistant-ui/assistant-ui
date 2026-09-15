import { cn } from "@/lib/utils";
import { type ThreadMessage, useAuiState } from "@assistant-ui/react-native";
import { type FC, useMemo } from "react";
import { View } from "react-native";
import { ConversationMap, type ConversationMapEntry } from "./conversation-map";
import { useThreadViewport } from "./thread.aui";

const TITLE_LENGTH = 72;
const PREVIEW_LENGTH = 240;

const partsOf = (message: ThreadMessage) => [...message.content];

const textOf = (message: ThreadMessage) =>
  partsOf(message)
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n")
    .trim();

const labelOf = (message: ThreadMessage) => {
  const parts = partsOf(message);
  const tools = parts.flatMap((part) =>
    part.type === "tool-call" ? [part.toolName] : [],
  );
  if (tools.length === 1) return tools[0]!;
  if (tools.length > 1) return `${tools.length} tool calls`;
  if (parts.some((part) => part.type === "reasoning")) return "Reasoning";

  // A composer submission carries its files in `attachments` and leaves
  // `content` empty, so both places decide an attachment-only turn's label.
  const carriers = [...parts, ...(message.attachments ?? [])];
  if (carriers.some((carrier) => carrier.type === "image")) return "Image";
  if (carriers.some((carrier) => carrier.type === "file")) return "File";
  if (carriers.length > 0) return "Attachment";
  return message.role === "user" ? "Message" : "Response";
};

/** Cuts on a word boundary so a title never splits a word. */
const cutAtWord = (text: string, limit: number) => {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const boundary = head.lastIndexOf(" ");
  return boundary > limit / 2 ? head.slice(0, boundary) : head;
};

const linesOf = (message: ThreadMessage) =>
  textOf(message)
    .split("\n")
    .map((line) => line.replace(/^[\s#>*`-]+/, "").trim())
    .filter(Boolean);

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
      continue;
    }
    current.members.push(message);
  }

  return turns;
};

const describe = ({ head, members }: Turn): ConversationMapEntry => {
  const lines = linesOf(head);
  const first = lines[0] ?? "";
  const title = cutAtWord(first, TITLE_LENGTH);

  // What the turn asked names it; what it answered is the useful preview, and
  // a turn still being answered falls back to the rest of its own text.
  const answer = members.find((member) => member !== head && textOf(member));
  const preview = (
    answer
      ? linesOf(answer).join(" ")
      : [first.slice(title.length), ...lines.slice(1)].join(" ")
  )
    .trim()
    .slice(0, PREVIEW_LENGTH);

  return {
    id: head.id,
    title: title || labelOf(head),
    ...(preview ? { preview } : {}),
  };
};

export interface ConversationMapAuiProps {
  side?: "left" | "right";
  className?: string;
}

/**
 * The rail over the thread's message list; mount it through the thread's
 * `Rail` slot so it can read the list through `useThreadViewport`.
 */
export const ConversationMapAui: FC<ConversationMapAuiProps> = ({
  side = "left",
  className,
}) => {
  const messages = useAuiState((s) => s.thread.messages);
  const { visibleMessageIds, descent, height, scrollToMessage } =
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
        "aui-conversation-map-rail absolute top-0 px-1 py-10",
        side === "right" ? "right-0" : "left-0",
        className,
      )}
      style={{ height }}
    >
      <ConversationMap
        entries={entries}
        activeId={activeId}
        visibleIds={visibleIds}
        onSelect={scrollToMessage}
        side={side === "right" ? "left" : "right"}
      />
    </View>
  );
};
