export type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

const DEFAULT_MAX_LINE_LENGTH = 16 * 1024 * 1024;
const DEFAULT_MAX_EVENT_LENGTH = 16 * 1024 * 1024;

export type SSEEventDecoderOptions = {
  trailing?: "drop" | "dispatch";
  /** Maximum UTF-16 code units retained for one unterminated SSE line. */
  maxLineLength?: number;
  /** Maximum UTF-16 code units retained across the data lines of one event. */
  maxEventLength?: number;
};

const readLimit = (
  value: number | undefined,
  fallback: number,
  name: string,
) => {
  const limit = value ?? fallback;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return limit;
};

export class SSEEventDecoder {
  private lineChunks: string[] = [];
  private lineLength = 0;
  private dataLines: string[] = [];
  private eventLength = 0;
  private eventName: string | undefined;
  private lastEventId: string | undefined;
  private retry: number | undefined;
  private pendingLF = false;
  private started = false;
  private readonly trailing: "drop" | "dispatch";
  private readonly maxLineLength: number;
  private readonly maxEventLength: number;

  constructor(options?: SSEEventDecoderOptions) {
    this.trailing = options?.trailing ?? "drop";
    this.maxLineLength = readLimit(
      options?.maxLineLength,
      DEFAULT_MAX_LINE_LENGTH,
      "maxLineLength",
    );
    this.maxEventLength = readLimit(
      options?.maxEventLength,
      DEFAULT_MAX_EVENT_LENGTH,
      "maxEventLength",
    );
  }

  push(text: string): SSEEvent[] {
    const events: SSEEvent[] = [];
    if (text === "") return events;

    if (!this.started) {
      this.started = true;
      if (text.startsWith("\uFEFF")) text = text.slice(1);
    }

    // Lines end with LF, CRLF, or CR. A chunk-trailing "\r" terminates its
    // line immediately; pendingLF then swallows the leading "\n" of the next
    // chunk so a CRLF split across chunks is not counted twice.
    if (this.pendingLF && text.startsWith("\n")) text = text.slice(1);
    this.pendingLF = text.endsWith("\r");

    const lines = text.split(/\r\n|\r|\n/);
    const remainder = lines.pop()!;

    for (const line of lines) {
      let completeLine = line;
      if (this.lineChunks.length > 0) {
        this.appendLineChunk(line);
        completeLine = this.lineChunks.join("");
        this.lineChunks = [];
        this.lineLength = 0;
      } else if (line.length > this.maxLineLength) {
        throw new Error(
          `SSE line exceeds maxLineLength (${line.length} > ${this.maxLineLength})`,
        );
      }
      const event = this.processLine(completeLine);
      if (event) events.push(event);
    }
    if (remainder !== "") this.appendLineChunk(remainder);

    return events;
  }

  flush(): SSEEvent | null {
    if (this.trailing === "drop") {
      this.resetFrame();
      this.lineChunks = [];
      this.lineLength = 0;
      this.pendingLF = false;
      return null;
    }

    if (this.lineChunks.length > 0) {
      this.processLine(this.lineChunks.join(""));
    }

    this.lineChunks = [];
    this.lineLength = 0;
    this.pendingLF = false;
    return this.dispatchEvent();
  }

  private processLine(line: string): SSEEvent | null {
    if (line === "") return this.dispatchEvent();
    if (line.startsWith(":")) return null;

    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    switch (field) {
      case "data": {
        const nextEventLength = this.eventLength + line.length + 1;
        if (nextEventLength > this.maxEventLength) {
          throw new Error(
            `SSE event exceeds maxEventLength (${nextEventLength} > ${this.maxEventLength})`,
          );
        }
        this.eventLength = nextEventLength;
        this.dataLines.push(value);
        break;
      }
      case "event":
        this.eventName = value;
        break;
      case "id":
        if (!value.includes("\u0000")) this.lastEventId = value;
        break;
      case "retry": {
        const retry = Number(value);
        if (/^\d+$/.test(value) && Number.isSafeInteger(retry)) {
          this.retry = retry;
        }
        break;
      }
    }

    return null;
  }

  private dispatchEvent(): SSEEvent | null {
    if (this.dataLines.length === 0) {
      this.resetFrame();
      return null;
    }

    const event: SSEEvent = { data: this.dataLines.join("\n") };
    if (this.eventName !== undefined) event.event = this.eventName;
    if (this.lastEventId !== undefined) event.id = this.lastEventId;
    if (this.retry !== undefined) event.retry = this.retry;
    this.resetFrame();
    return event;
  }

  private resetFrame() {
    this.dataLines = [];
    this.eventLength = 0;
    this.eventName = undefined;
  }

  private appendLineChunk(chunk: string) {
    const nextLineLength = this.lineLength + chunk.length;
    if (nextLineLength > this.maxLineLength) {
      throw new Error(
        `SSE line exceeds maxLineLength (${nextLineLength} > ${this.maxLineLength})`,
      );
    }
    this.lineChunks.push(chunk);
    this.lineLength = nextLineLength;
  }
}
