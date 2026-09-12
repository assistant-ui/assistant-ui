import type { ThreadMessage } from "@assistant-ui/react";
import type { ConversationMapEntry } from "./conversation-map";

const TITLE_LENGTH = 72;
const PREVIEW_LENGTH = 240;

export type ConversationMapTurn = {
  head: ThreadMessage;
  members: ThreadMessage[];
};

type MessageSummary = {
  hasText: boolean;
  title: string;
  answerPreview: string;
  questionPreview: string;
};

export type ConversationMapProjection = {
  messages: readonly ThreadMessage[];
  turns: readonly ConversationMapTurn[];
  entries: readonly ConversationMapEntry[];
  turnOf: ReadonlyMap<string, string>;
  turnKey: string;
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

const groupIntoTurns = (
  messages: readonly ThreadMessage[],
): ConversationMapTurn[] => {
  const turns: ConversationMapTurn[] = [];
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

const describe = ({
  head,
  members,
}: ConversationMapTurn): ConversationMapEntry => {
  const headSummary = summaryOf(head);
  let answerSummary: MessageSummary | undefined;
  for (const member of members) {
    if (member === head) continue;
    const summary = summaryOf(member);
    if (summary.hasText) {
      answerSummary = summary;
      break;
    }
  }
  const preview = answerSummary
    ? answerSummary.answerPreview
    : headSummary.questionPreview;
  return {
    id: head.id,
    title: headSummary.title,
    ...(preview ? { preview } : {}),
  };
};

export const projectConversationMap = (
  messages: readonly ThreadMessage[],
): ConversationMapProjection => {
  const turns = groupIntoTurns(messages);
  const turnOf = new Map<string, string>();
  for (const turn of turns) {
    for (const member of turn.members) turnOf.set(member.id, turn.head.id);
  }
  return {
    messages,
    turns,
    entries: turns.map(describe),
    turnOf,
    turnKey: turns.map((turn) => turn.head.id).join(" "),
  };
};
