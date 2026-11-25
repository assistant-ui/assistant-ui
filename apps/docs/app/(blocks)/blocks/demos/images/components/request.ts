import type { PrepareSendMessagesRequest, UIMessage } from "ai";

const isPicture = (part: UIMessage["parts"][number]) =>
  part.type === "file" && part.mediaType.startsWith("image/");

/*
 * The route needs the newest request and the newest picture, which a
 * follow-up changes. Earlier pictures stay in the page, so a long chat does
 * not send every one of them again.
 */
function newest(messages: readonly UIMessage[]) {
  const asked = messages.findLast((message) => message.role === "user");
  const pictured = messages.findLast(
    (message) => message.role === "assistant" && message.parts.some(isPicture),
  );
  return [
    ...(pictured
      ? [{ ...pictured, parts: pictured.parts.filter(isPicture).slice(-1) }]
      : []),
    ...(asked ? [asked] : []),
  ];
}

const isEdit = (metadata: unknown) => {
  const custom = (metadata as { custom?: { edit?: unknown } } | undefined)
    ?.custom;
  return typeof custom?.edit === "string";
};

/**
 * Builds each request's body. A change sent from the editor carries settings
 * of its own (the kind of change, one picture, its shape or background), so
 * making it again sends those settings and not what the menu holds now.
 */
export function createRequestBody(): PrepareSendMessagesRequest<UIMessage> {
  const edits = new Map<string, unknown>();
  return (options) => {
    const askedId = options.messages.findLast(
      (message) => message.role === "user",
    )?.id;
    let metadata = options.requestMetadata;
    if (askedId && options.trigger === "submit-message" && isEdit(metadata))
      edits.set(askedId, metadata);
    if (askedId && options.trigger === "regenerate-message")
      metadata = edits.get(askedId) ?? metadata;

    return {
      body: {
        ...options.body,
        id: options.id,
        messages: newest(options.messages),
        trigger: options.trigger,
        messageId: options.messageId,
        metadata,
      },
    };
  };
}
