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
  type Frame =
    | {
        readonly type: "messages";
        readonly values: readonly ThreadMessage[];
        index: number;
      }
    | {
        readonly type: "content";
        readonly values: readonly ThreadAssistantMessagePart[];
        readonly messageId: string;
        index: number;
      };

  const frames: Frame[] = [{ type: "messages", values: messages, index: 0 }];
  let activeMessageArrays: WeakSet<object> | undefined;

  const pushMessagesFrame = (
    frame: Extract<Frame, { readonly type: "messages" }>,
  ) => {
    if (!activeMessageArrays) {
      activeMessageArrays = new WeakSet<object>();
      for (const active of frames) {
        if (active.type === "messages") {
          activeMessageArrays.add(active.values);
        }
      }
    }
    if (activeMessageArrays.has(frame.values)) {
      throw new TypeError("Cyclic tool-call message tree");
    }
    activeMessageArrays.add(frame.values);
    frames.push(frame);
  };

  while (frames.length > 0) {
    const frame = frames[frames.length - 1]!;
    if (frame.index >= frame.values.length) {
      frames.pop();
      if (frame.type === "messages") {
        activeMessageArrays?.delete(frame.values);
      }
      continue;
    }

    if (frame.type === "messages") {
      const message = frame.values[frame.index++];
      if (message?.role !== "assistant" || !Array.isArray(message.content)) {
        continue;
      }
      frames.push({
        type: "content",
        values: message.content,
        messageId: message.id,
        index: 0,
      });
      continue;
    }

    const part = frame.values[frame.index++];
    if (!part || part.type !== "tool-call") continue;
    yield { part, messageId: frame.messageId };
    if (part.messages?.length) {
      pushMessagesFrame({ type: "messages", values: part.messages, index: 0 });
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
    readonly type: "content";
    readonly values: readonly ThreadAssistantMessagePart[];
    readonly parent?: {
      readonly frame: MessagesFrame;
      readonly message: ThreadAssistantMessage;
    };
    readonly next: ThreadAssistantMessagePart[];
    index: number;
    changed: boolean;
  };

  type MessagesFrame = {
    readonly type: "messages";
    readonly values: readonly ThreadMessage[];
    readonly originalPart: ToolCallMessagePart;
    readonly mappedPart: ToolCallMessagePart;
    readonly parent: ContentFrame;
    readonly next: ThreadMessage[];
    index: number;
    changed: boolean;
  };

  const root: ContentFrame = {
    type: "content",
    values: content,
    next: [],
    index: 0,
    changed: false,
  };
  const frames: Array<ContentFrame | MessagesFrame> = [root];
  let activeMessageArrays: WeakSet<object> | undefined;

  const pushMessagesFrame = (frame: MessagesFrame) => {
    activeMessageArrays ??= new WeakSet<object>();
    if (activeMessageArrays.has(frame.values)) {
      throw new TypeError("Cyclic tool-call message tree");
    }
    activeMessageArrays.add(frame.values);
    frames.push(frame);
  };

  while (frames.length > 0) {
    const frame = frames[frames.length - 1]!;

    if (frame.type === "content") {
      if (frame.index >= frame.values.length) {
        frames.pop();
        const nextContent = frame.changed ? frame.next : frame.values;
        if (!frame.parent) {
          return { content: nextContent, changed: frame.changed };
        }

        const { frame: parent, message } = frame.parent;
        if (frame.changed) {
          parent.next.push({ ...message, content: nextContent });
          parent.changed = true;
        } else {
          parent.next.push(message);
        }
        continue;
      }

      const part = frame.values[frame.index++]!;
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

      pushMessagesFrame({
        type: "messages",
        values: mapped.messages,
        originalPart: part,
        mappedPart: mapped,
        parent: frame,
        next: [],
        index: 0,
        changed: false,
      });
      continue;
    }

    if (frame.index >= frame.values.length) {
      frames.pop();
      activeMessageArrays?.delete(frame.values);
      const mapped = frame.changed
        ? { ...frame.mappedPart, messages: frame.next }
        : frame.mappedPart;
      frame.parent.next.push(mapped);
      if (mapped !== frame.originalPart) frame.parent.changed = true;
      continue;
    }

    const nested = frame.values[frame.index++]!;
    if (nested.role !== "assistant" || !Array.isArray(nested.content)) {
      frame.next.push(nested);
      continue;
    }

    const assistant = nested as ThreadAssistantMessage;
    frames.push({
      type: "content",
      values: assistant.content,
      parent: { frame, message: assistant },
      next: [],
      index: 0,
      changed: false,
    });
  }

  throw new Error("Tool-call tree traversal ended without a root result");
}
