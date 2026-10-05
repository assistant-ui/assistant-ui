const DEFAULT_MAX_LINE_LENGTH = 16 * 1024 * 1024;

export class LineDecoderStream extends TransformStream<string, string> {
  private buffer = "";
  private skipNextLineFeed = false;

  constructor(options?: { maxLineLength?: number | undefined }) {
    const maxLineLength = options?.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH;
    if (!Number.isSafeInteger(maxLineLength) || maxLineLength <= 0) {
      throw new RangeError("maxLineLength must be a positive safe integer");
    }

    super({
      transform: (chunk, controller) => {
        let lineStart = 0;

        for (let i = 0; i < chunk.length; i++) {
          const character = chunk[i]!;

          if (this.skipNextLineFeed) {
            this.skipNextLineFeed = false;
            if (character === "\n") {
              lineStart = i + 1;
              continue;
            }
          }

          if (character === "\n" || character === "\r") {
            this.append(chunk.slice(lineStart, i), maxLineLength);
            controller.enqueue(this.buffer);
            this.buffer = "";
            this.skipNextLineFeed = character === "\r";
            lineStart = i + 1;
          }
        }

        this.append(chunk.slice(lineStart), maxLineLength);
      },
      flush: () => {
        if (this.buffer) {
          throw new Error(
            `Stream ended with an incomplete line (${this.buffer.length} characters)`,
          );
        }
      },
    });
  }

  private append(value: string, maxLineLength: number) {
    const nextLength = this.buffer.length + value.length;
    if (nextLength > maxLineLength) {
      this.buffer = "";
      throw new Error(
        `Stream line exceeds maxLineLength (${nextLength} > ${maxLineLength})`,
      );
    }
    this.buffer += value;
  }
}
