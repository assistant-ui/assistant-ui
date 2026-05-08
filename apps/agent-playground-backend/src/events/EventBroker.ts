import type { ServerEvent } from "./types.js";

type EventListener = (event: ServerEvent) => void;

export class EventBroker {
  private listeners = new Set<EventListener>();
  private buffer: ServerEvent[] = [];

  constructor(
    public readonly sessionId: string,
    private readonly maxBufferSize = 10000,
  ) {}

  emit(event: ServerEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.splice(0, this.buffer.length - this.maxBufferSize);
    }
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Event listener failed", error);
      }
    }
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getHistory(sinceId?: string): ServerEvent[] {
    if (!sinceId) return [...this.buffer];
    const index = this.buffer.findIndex((event) => event.id === sinceId);
    if (index === -1) return [...this.buffer];
    return this.buffer.slice(index + 1);
  }

  destroy(): void {
    this.listeners.clear();
    this.buffer = [];
  }
}
