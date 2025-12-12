import {
  MessageRepository,
  generateId,
  type ThreadMessage,
  type Unsubscribe,
} from "@assistant-ui/core";
import type {
  ThreadRuntimeState,
  ThreadRuntime,
  ThreadCapabilities,
  AppendMessage,
} from "./types";

export type ChatModelRunOptions = {
  messages: readonly ThreadMessage[];
  abortSignal: AbortSignal;
  onUpdate: (message: ThreadMessage) => void;
};

export type ChatModelAdapter = {
  run: (options: ChatModelRunOptions) => Promise<ThreadMessage>;
};

export type ThreadRuntimeOptions = {
  threadId: string;
  chatModel: ChatModelAdapter;
  loadMessages: (threadId: string) => Promise<ThreadMessage[]>;
  saveMessages: (
    threadId: string,
    messages: readonly ThreadMessage[],
  ) => Promise<void>;
  onMessagesChange?: (messages: readonly ThreadMessage[]) => void;
  capabilities?: Partial<ThreadCapabilities>;
};

const DEFAULT_CAPABILITIES: ThreadCapabilities = {
  switchToBranch: false,
  edit: false,
  reload: false,
  cancel: true,
  unstable_copy: true,
  speech: false,
  attachments: false,
  feedback: false,
};

export class ThreadRuntimeCore implements ThreadRuntime {
  private _state: ThreadRuntimeState;
  private _subscribers = new Set<() => void>();
  private _messageRepository: MessageRepository;
  private _options: ThreadRuntimeOptions;
  private _abortController: AbortController | null = null;
  private _isInitialized = false;

  constructor(options: ThreadRuntimeOptions) {
    this._options = options;
    this._messageRepository = new MessageRepository();
    this._state = {
      threadId: options.threadId,
      isRunning: false,
      isDisabled: false,
      isEmpty: true,
      isLoading: true,
      messages: [],
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        ...options.capabilities,
      },
    };
  }

  public async initialize(): Promise<void> {
    if (this._isInitialized) return;
    this._isInitialized = true;

    try {
      const messages = await this._options.loadMessages(this._options.threadId);
      if (messages.length > 0) {
        let parentId: string | null = null;
        for (const message of messages) {
          this._messageRepository.addOrUpdateMessage(parentId, message);
          parentId = message.id;
        }
        this._updateState();
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      this._setState({
        ...this._state,
        isLoading: false,
      });
    }
  }

  private _setState(state: ThreadRuntimeState): void {
    this._state = state;
    this._notifySubscribers();
  }

  private _updateState(shouldSave = false): void {
    const messages = this._messageRepository.getMessages();
    this._setState({
      ...this._state,
      messages,
      isEmpty: messages.length === 0,
    });

    this._options.onMessagesChange?.(messages);

    if (shouldSave && messages.length > 0) {
      this._options.saveMessages(this._options.threadId, messages);
    }
  }

  private _notifySubscribers(): void {
    this._subscribers.forEach((callback) => callback());
  }

  public getState(): ThreadRuntimeState {
    return this._state;
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }

  public append(message: AppendMessage): void {
    const messages = this._messageRepository.getMessages();
    const parentId = message.parentId ?? messages.at(-1)?.id ?? null;

    const id = generateId();
    const createdAt = new Date();
    const content = message.content.map((part) => ({
      type: "text" as const,
      text: part.text ?? "",
    }));

    if (message.role === "user") {
      const userMessage: ThreadMessage = {
        id,
        role: "user",
        content,
        createdAt,
        attachments: [],
        metadata: { custom: {} },
      };
      this._messageRepository.addOrUpdateMessage(parentId, userMessage);
      this._updateState(true);
      this._runModel(userMessage.id);
    } else {
      const assistantMessage: ThreadMessage = {
        id,
        role: "assistant",
        content,
        createdAt,
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };
      this._messageRepository.addOrUpdateMessage(parentId, assistantMessage);
      this._updateState(true);
    }
  }

  private async _runModel(parentId: string): Promise<void> {
    this._setState({ ...this._state, isRunning: true });

    this._abortController = new AbortController();
    const assistantMessageId = generateId();

    const initialMessage: ThreadMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: [{ type: "text", text: "" }],
      createdAt: new Date(),
      status: { type: "running" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };

    this._messageRepository.addOrUpdateMessage(parentId, initialMessage);
    this._updateState(false);

    try {
      const messages = this._messageRepository.getMessages();
      const finalMessage = await this._options.chatModel.run({
        messages,
        abortSignal: this._abortController.signal,
        onUpdate: (message) => {
          this._messageRepository.addOrUpdateMessage(parentId, {
            ...message,
            id: assistantMessageId,
          });
          this._updateState(false);
        },
      });

      this._messageRepository.addOrUpdateMessage(parentId, {
        ...finalMessage,
        id: assistantMessageId,
        status: { type: "complete", reason: "stop" },
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        const existingMessage =
          this._messageRepository.getMessage(assistantMessageId).message;
        const existingText = existingMessage.content
          .filter((p) => p.type === "text")
          .map((p) => ("text" in p ? p.text : ""))
          .join("");

        this._messageRepository.addOrUpdateMessage(parentId, {
          ...existingMessage,
          content: [{ type: "text", text: existingText }],
          status: { type: "incomplete", reason: "cancelled" },
        });
      } else {
        console.error("Model run error:", error);
        this._messageRepository.addOrUpdateMessage(parentId, {
          id: assistantMessageId,
          role: "assistant",
          content: [
            {
              type: "text",
              text: `Error: ${(error as Error).message || "Failed to get response"}`,
            },
          ],
          createdAt: initialMessage.createdAt,
          status: { type: "incomplete", reason: "error" },
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        });
      }
    } finally {
      this._setState({ ...this._state, isRunning: false });
      this._abortController = null;
      this._updateState(true);
    }
  }

  public startRun(parentId: string | null): void {
    if (parentId) {
      this._runModel(parentId);
    }
  }

  public cancelRun(): void {
    if (this._abortController) {
      this._abortController.abort();
    }
    this._setState({ ...this._state, isRunning: false });
  }

  public getMessages(): readonly ThreadMessage[] {
    return this._messageRepository.getMessages();
  }
}
