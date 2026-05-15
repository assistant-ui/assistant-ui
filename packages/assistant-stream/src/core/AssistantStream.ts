import type { AssistantStreamChunk } from "./AssistantStreamChunk";

/**
 * Stream of assistant-ui protocol chunks.
 *
 * `AssistantStream` is the normalized internal stream format used by
 * encoders, decoders, accumulators, and tool execution transforms. Use an
 * encoder such as `DataStreamEncoder` when returning it from an HTTP route,
 * and the matching decoder when reading it back from a response.
 */
export type AssistantStream = ReadableStream<AssistantStreamChunk>;

/**
 * Encoder that converts an {@link AssistantStream} into bytes suitable for an
 * HTTP response body.
 *
 * Encoders may expose response headers, such as content type or protocol
 * markers, through `headers`.
 */
export type AssistantStreamEncoder = ReadableWritablePair<
  Uint8Array<ArrayBuffer>,
  AssistantStreamChunk
> & {
  headers?: Headers;
};

export const AssistantStream = {
  /**
   * Converts an {@link AssistantStream} into a `Response` using the supplied
   * encoder.
   *
   * The encoder's `headers` are copied onto the response. Pair this with the
   * decoder for the same wire format when consuming the response.
   */
  toResponse(stream: AssistantStream, transformer: AssistantStreamEncoder) {
    return new Response(AssistantStream.toByteStream(stream, transformer), {
      headers: transformer.headers ?? {},
    });
  },

  /**
   * Reads an assistant stream from a `Response` body using the supplied
   * decoder.
   *
   * The response body must be present and encoded with the matching assistant
   * stream wire format.
   */
  fromResponse(
    response: Response,
    transformer: ReadableWritablePair<
      AssistantStreamChunk,
      Uint8Array<ArrayBuffer>
    >,
  ) {
    return AssistantStream.fromByteStream(response.body!, transformer);
  },

  /**
   * Pipes an {@link AssistantStream} through an encoder and returns the
   * resulting byte stream.
   */
  toByteStream(
    stream: AssistantStream,
    transformer: ReadableWritablePair<
      Uint8Array<ArrayBuffer>,
      AssistantStreamChunk
    >,
  ) {
    return stream.pipeThrough(transformer);
  },

  /**
   * Pipes a byte stream through a decoder and returns normalized
   * {@link AssistantStreamChunk} values.
   */
  fromByteStream(
    readable: ReadableStream<Uint8Array<ArrayBuffer>>,
    transformer: ReadableWritablePair<
      AssistantStreamChunk,
      Uint8Array<ArrayBuffer>
    >,
  ) {
    return readable.pipeThrough(transformer);
  },
};
