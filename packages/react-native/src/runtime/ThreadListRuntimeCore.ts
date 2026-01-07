import { generateId, type Unsubscribe } from "@assistant-ui/core";
import type {
  ThreadListState,
  ThreadListItemState,
  ThreadListRuntime,
} from "./types";

export type ThreadListRuntimeOptions = {
  /**
   * Load threads from storage
   */
  loadThreads: () => Promise<ThreadListItemState[]>;

  /**
   * Save threads to storage
   */
  saveThreads: (threads: ThreadListItemState[]) => Promise<void>;

  /**
   * Called when a thread is selected
   */
  onSwitchToThread?: (threadId: string) => void;

  /**
   * Called when a new thread is created and selected
   */
  onSwitchToNewThread?: (threadId: string) => void;

  /**
   * Generate a title for a thread
   */
  generateTitle?: (
    threadId: string,
    messages: readonly unknown[],
  ) => Promise<string>;
};

export class ThreadListRuntimeCore implements ThreadListRuntime {
  private _state: ThreadListState;
  private _subscribers = new Set<() => void>();
  private _options: ThreadListRuntimeOptions;

  constructor(options: ThreadListRuntimeOptions) {
    this._options = options;
    this._state = {
      threads: [],
      isLoading: true,
      newThreadId: undefined,
    };
  }

  public async initialize(): Promise<void> {
    try {
      const threads = await this._options.loadThreads();
      this._setState({
        threads,
        isLoading: false,
        newThreadId: undefined,
      });
    } catch (error) {
      console.error("Failed to load threads:", error);
      this._setState({
        threads: [],
        isLoading: false,
        newThreadId: undefined,
      });
    }
  }

  private _setState(state: ThreadListState): void {
    this._state = state;
    this._notifySubscribers();
  }

  private _notifySubscribers(): void {
    this._subscribers.forEach((callback) => callback());
  }

  public getState(): ThreadListState {
    return this._state;
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }

  public createThread(): string {
    const id = generateId();
    // Don't add to list yet - will be added when first message is sent
    return id;
  }

  public async addThread(thread: ThreadListItemState): Promise<void> {
    const threads = [thread, ...this._state.threads];
    this._setState({
      ...this._state,
      threads,
    });
    await this._options.saveThreads([...threads]);
  }

  public async deleteThread(threadId: string): Promise<void> {
    const threads = this._state.threads.filter((t) => t.id !== threadId);
    this._setState({
      ...this._state,
      threads,
    });
    await this._options.saveThreads([...threads]);
  }

  public async updateThread(
    threadId: string,
    updates: Partial<
      Pick<ThreadListItemState, "title" | "lastMessageAt" | "status">
    >,
  ): Promise<void> {
    const threads = this._state.threads.map((t) =>
      t.id === threadId ? { ...t, ...updates } : t,
    );
    // Sort by lastMessageAt descending
    threads.sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
    );
    this._setState({
      ...this._state,
      threads,
    });
    await this._options.saveThreads([...threads]);
  }

  public getThread(threadId: string): ThreadListItemState | undefined {
    return this._state.threads.find((t) => t.id === threadId);
  }

  public switchToThread(threadId: string): void {
    this._options.onSwitchToThread?.(threadId);
  }

  public switchToNewThread(): string {
    const threadId = this.createThread();
    this._setState({
      ...this._state,
      newThreadId: threadId,
    });
    this._options.onSwitchToNewThread?.(threadId);
    return threadId;
  }

  public async generateTitle(
    threadId: string,
    messages: readonly unknown[],
  ): Promise<void> {
    if (!this._options.generateTitle) return;

    try {
      const title = await this._options.generateTitle(threadId, messages);
      await this.updateThread(threadId, { title });
    } catch (error) {
      console.error("Failed to generate title:", error);
    }
  }
}
