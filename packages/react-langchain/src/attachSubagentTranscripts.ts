import {
  bindExternalStoreMessage,
  getExternalStoreMessages,
  type ThreadMessage,
  type ToolCallTiming,
} from "@assistant-ui/core";

export type SubagentTranscript = {
  readonly messages: readonly ThreadMessage[];
  /**
   * Only present when the client watched the task run: the discovery
   * timestamps are stamped when the task call is first seen, so a thread
   * seeded from a checkpoint would report a duration of zero.
   */
  readonly timing?: ToolCallTiming;
};

type AttachedTranscript = readonly [string, SubagentTranscript];

type AttachedMessage = {
  transcripts: readonly AttachedTranscript[];
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
  a: readonly AttachedTranscript[],
  b: readonly AttachedTranscript[],
) =>
  a.length === b.length &&
  a.every(
    ([toolCallId, transcript], index) =>
      toolCallId === b[index]![0] && transcript === b[index]![1],
  );

export const attachSubagentTranscripts = (
  messages: readonly ThreadMessage[],
  transcripts: ReadonlyMap<string, SubagentTranscript>,
  memo: AttachMemo,
): readonly ThreadMessage[] => {
  let attachedAny = false;
  const next = messages.map((message) => {
    const attachedTranscripts = message.content.flatMap((part) =>
      part.type === "tool-call" && transcripts.has(part.toolCallId)
        ? [[part.toolCallId, transcripts.get(part.toolCallId)!] as const]
        : [],
    );
    if (attachedTranscripts.length === 0) return message;
    attachedAny = true;

    const cached = memo.messages.get(message);
    if (cached && sameTranscripts(cached.transcripts, attachedTranscripts))
      return cached.attached;

    const attached = {
      ...message,
      content: message.content.map((part) => {
        const transcript =
          part.type === "tool-call"
            ? transcripts.get(part.toolCallId)
            : undefined;
        return transcript
          ? {
              ...part,
              messages: transcript.messages,
              ...(transcript.timing && { timing: transcript.timing }),
            }
          : part;
      }),
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
