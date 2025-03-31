import { AssistantStreamChunk } from "./AssistantStreamChunk";

export type AssistantStream = ReadableStream<AssistantStreamChunk>;

export const AssistantStream = {
  toResponse(
    stream: AssistantStream,
    transformer: ReadableWritablePair<Uint8Array, AssistantStreamChunk>,
  ) {
    return new Response(AssistantStream.toByteStream(stream, transformer));
  },

  fromResponse(
    response: Response,
    transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array>,
  ) {
    return AssistantStream.fromByteStream(response.body!, transformer);
  },

  toByteStream(
    stream: AssistantStream,
    transformer: ReadableWritablePair<Uint8Array, AssistantStreamChunk>,
  ) {
    return stream.pipeThrough(transformer);
  },

  fromByteStream(
    readable: ReadableStream<Uint8Array>,
    transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array>,
  ) {
    return readable.pipeThrough(transformer);
  },
};
