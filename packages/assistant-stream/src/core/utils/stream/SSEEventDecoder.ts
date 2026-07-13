export type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

export class SSEEventDecoder {
  private lineBuffer = "";
  private dataLines: string[] = [];
  private eventName: string | undefined;
  private lastEventId: string | undefined;
  private retry: number | undefined;
  private pendingLF = false;
  private readonly trailing: "drop" | "dispatch";

  constructor(options?: { trailing?: "drop" | "dispatch" }) {
    this.trailing = options?.trailing ?? "drop";
  }

  push(text: string): SSEEvent[] {
    const events: SSEEvent[] = [];
    if (text === "") return events;

    // Lines end with LF, CRLF, or CR. A chunk-trailing "\r" terminates its
    // line immediately; pendingLF then swallows the leading "\n" of the next
    // chunk so a CRLF split across chunks is not counted twice.
    if (this.pendingLF && text.startsWith("\n")) text = text.slice(1);
    this.pendingLF = text.endsWith("\r");

    this.lineBuffer += text;
    const lines = this.lineBuffer.split(/\r\n|\r|\n/);
    this.lineBuffer = lines.pop()!;

    for (const line of lines) {
      const event = this.processLine(line);
      if (event) events.push(event);
    }

    return events;
  }

  flush(): SSEEvent | null {
    if (this.trailing === "drop") {
      this.resetFrame();
      this.lineBuffer = "";
      this.pendingLF = false;
      return null;
    }

    if (this.lineBuffer.length > 0) {
      this.processLine(this.lineBuffer);
    }

    this.lineBuffer = "";
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
      case "data":
        this.dataLines.push(value);
        break;
      case "event":
        this.eventName = value;
        break;
      case "id":
        this.lastEventId = value;
        break;
      case "retry": {
        const retry = Number(value);
        if (Number.isFinite(retry)) this.retry = retry;
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
    this.eventName = undefined;
  }
}
