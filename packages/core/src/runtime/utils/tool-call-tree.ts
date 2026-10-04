import type {
  ThreadAssistantMessage,
  ThreadAssistantMessagePart,
  ThreadMessage,
  ToolCallMessagePart,
} from "../../types/message";

export type ToolCallTreeEntry = {
  readonly part: ToolCallMessagePart;
  /** Id of the message whose content directly holds `part`. */
  readonly messageId: string;
};

/**
 * Walk every tool-call part reachable from `messages`. A tool call projects a
 * child run as nested messages on `ToolCallMessagePart.messages`, so a
 * subagent's own calls live below the top-level content and a seam that only
 * scans the top level cannot reach them.
 *
 * Parts arrive in document order, each one ahead of its own descendants.
 * `messageId` names the message that directly holds the part, which for a
 * nested call is the child run's message rather than the top-level message the
 * tree hangs from. Only assistant messages are descended, the same rule
 * {@link mapToolCallPartsDeep} rewrites under, so a part this reports is always
 * a part that can be written back.
 */
export function* walkToolCallTree(
  messages: readonly ThreadMessage[],
): Generator<ToolCallTreeEntry> {
  const stack: {
    messages: readonly ThreadMessage[];
    messageIndex: number;
    partIndex: number;
  }[] = [{ messages, messageIndex: 0, partIndex: 0 }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.messageIndex >= frame.messages.length) {
      stack.pop();
      continue;
    }

    const message = frame.messages[frame.messageIndex]!;
    if (message?.role !== "assistant" || !Array.isArray(message.content)) {
      frame.messageIndex++;
      frame.partIndex = 0;
      continue;
    }

    if (frame.partIndex >= message.content.length) {
      frame.messageIndex++;
      frame.partIndex = 0;
      continue;
    }

    const part = message.content[frame.partIndex++];
    if (!part || part.type !== "tool-call") continue;
    yield { part, messageId: message.id };
    if (part.messages?.length) {
      stack.push({ messages: part.messages, messageIndex: 0, partIndex: 0 });
    }
  }
}

/**
 * Content-level form of {@link walkToolCallTree}, for a caller that already
 * holds one assistant message's content and does not need the owning id.
 */
export function* iterateToolCallParts(
  content: readonly ThreadAssistantMessagePart[],
): Generator<ToolCallMessagePart> {
  for (const part of content) {
    if (!part || part.type !== "tool-call") continue;
    yield part;
    if (part.messages?.length) {
      for (const entry of walkToolCallTree(part.messages)) {
        yield entry.part;
      }
    }
  }
}

/**
 * Rebuild `content` with `fn` applied to every tool-call part in the tree.
 * Arrays and nested messages are reused wherever `fn` returned the part it was
 * given, so an unchanged subtree keeps its identity and `changed` reports
 * whether anything moved.
 */
export function mapToolCallPartsDeep(
  content: readonly ThreadAssistantMessagePart[],
  fn: (part: ToolCallMessagePart) => ToolCallMessagePart,
): { content: readonly ThreadAssistantMessagePart[]; changed: boolean } {
  type ContentFrame = {
    kind: "content";
    content: readonly ThreadAssistantMessagePart[];
    length: number;
    index: number;
    next: ThreadAssistantMessagePart[];
    changed: boolean;
    pendingPart:
      | { part: ToolCallMessagePart; mapped: ToolCallMessagePart }
      | undefined;
  };
  type MessagesFrame = {
    kind: "messages";
    messages: readonly ThreadMessage[];
    length: number;
    index: number;
    next: ThreadMessage[];
    changed: boolean;
    pendingMessage: ThreadAssistantMessage | undefined;
  };
  type Frame = ContentFrame | MessagesFrame;

  const stack: Frame[] = [
    {
      kind: "content",
      content,
      length: content.length,
      index: 0,
      next: [],
      changed: false,
      pendingPart: undefined,
    },
  ];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.index < frame.length) {
      const index = frame.index++;
      if (frame.kind === "content") {
        if (!(index in frame.content)) {
          frame.next.length++;
          continue;
        }
        const part = frame.content[index]!;
        if (part.type !== "tool-call") {
          frame.next.push(part);
          continue;
        }

        const mapped = fn(part);
        if (mapped.messages === undefined) {
          frame.next.push(mapped);
          if (mapped !== part) frame.changed = true;
          continue;
        }

        frame.pendingPart = { part, mapped };
        stack.push({
          kind: "messages",
          messages: mapped.messages,
          length: mapped.messages.length,
          index: 0,
          next: [],
          changed: false,
          pendingMessage: undefined,
        });
        continue;
      }

      if (!(index in frame.messages)) {
        frame.next.length++;
        continue;
      }
      const nested = frame.messages[index]!;
      if (nested.role !== "assistant" || !Array.isArray(nested.content)) {
        frame.next.push(nested);
        continue;
      }

      const assistant = nested as ThreadAssistantMessage;
      frame.pendingMessage = assistant;
      stack.push({
        kind: "content",
        content: assistant.content,
        length: assistant.content.length,
        index: 0,
        next: [],
        changed: false,
        pendingPart: undefined,
      });
      continue;
    }

    stack.pop();
    if (stack.length === 0) {
      return {
        content:
          frame.kind === "content" && frame.changed ? frame.next : content,
        changed: frame.changed,
      };
    }

    const parent = stack[stack.length - 1]!;
    if (frame.kind === "content" && parent.kind === "messages") {
      const assistant = parent.pendingMessage!;
      parent.pendingMessage = undefined;
      const nested = frame.changed
        ? { ...assistant, content: frame.next }
        : assistant;
      parent.next.push(nested);
      if (nested !== assistant) parent.changed = true;
      continue;
    }

    if (frame.kind === "messages" && parent.kind === "content") {
      const pending = parent.pendingPart!;
      parent.pendingPart = undefined;
      const mapped = frame.changed
        ? { ...pending.mapped, messages: frame.next }
        : pending.mapped;
      parent.next.push(mapped);
      if (mapped !== pending.part) parent.changed = true;
    }
  }

  return { content, changed: false };
}
