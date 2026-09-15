import {
  bindExternalStoreMessage,
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/core";

type AttachedMessage = {
  transcripts: readonly (readonly ThreadMessage[])[];
  attached: ThreadMessage;
};

export type AttachMemo = {
  messages: WeakMap<ThreadMessage, AttachedMessage>;
  results: WeakMap<readonly ThreadMessage[], readonly ThreadMessage[]>;
};

export const createAttachMemo = (): AttachMemo => ({
  messages: new WeakMap(),
  results: new WeakMap(),
});

const sameTranscripts = (
  a: readonly (readonly ThreadMessage[])[],
  b: readonly (readonly ThreadMessage[])[],
) =>
  a.length === b.length &&
  a.every((transcript, index) => transcript === b[index]);

export const attachSubagentTranscripts = (
  messages: readonly ThreadMessage[],
  transcripts: ReadonlyMap<string, readonly ThreadMessage[]>,
  memo: AttachMemo,
): readonly ThreadMessage[] => {
  let attachedAny = false;
  const next = messages.map((message) => {
    const attachedTranscripts = message.content.flatMap((part) =>
      part.type === "tool-call" && transcripts.has(part.toolCallId)
        ? [transcripts.get(part.toolCallId)!]
        : [],
    );
    if (attachedTranscripts.length === 0) return message;
    attachedAny = true;

    const cached = memo.messages.get(message);
    if (cached && sameTranscripts(cached.transcripts, attachedTranscripts))
      return cached.attached;

    const attached = {
      ...message,
      content: message.content.map((part) =>
        part.type === "tool-call" && transcripts.has(part.toolCallId)
          ? { ...part, messages: transcripts.get(part.toolCallId)! }
          : part,
      ),
    } as ThreadMessage;
    memo.messages.set(message, { transcripts: attachedTranscripts, attached });
    return attached;
  });

  if (!attachedAny) return messages;
  const previous = memo.results.get(messages);
  if (previous && previous.every((message, index) => message === next[index]))
    return previous;
  bindExternalStoreMessage(next, getExternalStoreMessages({ messages }));
  memo.results.set(messages, next);
  return next;
};
