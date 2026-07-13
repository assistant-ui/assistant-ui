export class LineDecoderStream extends TransformStream<string, string> {
  private buffer = "";
  private pendingLF = false;

  constructor() {
    super({
      transform: (chunk, controller) => {
        if (chunk === "") return;

        // A chunk-trailing CR terminates its line immediately. Skip a leading
        // LF in the next chunk so a split CRLF is counted only once.
        if (this.pendingLF && chunk.startsWith("\n")) {
          chunk = chunk.slice(1);
        }
        this.pendingLF = chunk.endsWith("\r");

        this.buffer += chunk;
        const lines = this.buffer.split(/\r\n|\r|\n/);
        this.buffer = lines.pop()!;

        for (const line of lines) {
          controller.enqueue(line);
        }
      },
      flush: () => {
        if (this.buffer) {
          throw new Error(
            `Stream ended with an incomplete line: "${this.buffer}"`,
          );
        }
      },
    });
  }
}
