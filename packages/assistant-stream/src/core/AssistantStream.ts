export type AssistantStreamChunk =
  | {
      type: "text-delta";
      textDelta: string;
    }
  | {
      type: "tool-call-begin";
      toolCallId: string;
      toolName: string;
    }
  | {
      type: "tool-call-delta";
      toolCallId: string;
      argsTextDelta: string;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      result: any;
    }
  | {
      type: "error";
      error: string;
    };

export class AssistantStream {
  constructor(public readonly readable: ReadableStream<AssistantStreamChunk>) {
    this.readable = readable;
  }

  toResponse(
    transformer: ReadableWritablePair<Uint8Array, AssistantStreamChunk>,
  ) {
    return new Response(this.toByteStream(transformer));
  }

  static fromResponse(
    response: Response,
    transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array>,
  ) {
    return AssistantStream.fromByteStream(response.body!, transformer);
  }

  toByteStream(
    transformer: ReadableWritablePair<Uint8Array, AssistantStreamChunk>,
  ) {
    return this.readable.pipeThrough(transformer);
  }

  static fromByteStream(
    readable: ReadableStream<Uint8Array>,
    transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array>,
  ) {
    return new AssistantStream(readable.pipeThrough(transformer));
  }

  tee(): [AssistantStream, AssistantStream] {
    const [readable1, readable2] = this.readable.tee();
    return [new AssistantStream(readable1), new AssistantStream(readable2)];
  }
}
