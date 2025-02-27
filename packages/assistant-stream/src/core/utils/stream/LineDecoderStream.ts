export class LineDecoderStream extends TransformStream<string, string> {
  private buffer = "";

  constructor() {
    super({
      transform: (chunk, controller) => {
        this.buffer += chunk;
        const lines = this.buffer.split("\n");

        // Process all complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          controller.enqueue(lines[i]);
        }

        // Keep the last incomplete line in the buffer
        this.buffer = lines[lines.length - 1]!;
      },
      flush: (controller) => {
        // flush any remaining content in the buffer
        if (this.buffer) {
          controller.enqueue(this.buffer);
        }
      },
    });
  }
}
