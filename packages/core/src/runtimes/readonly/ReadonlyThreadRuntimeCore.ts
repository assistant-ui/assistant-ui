import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadMessage } from "../../types/message";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import { BaseSubscribable } from "../../subscribable/subscribable";

const READONLY_THREAD_ERROR = new Error(
  "This is a readonly thread. You cannot perform mutations on readonly threads.",
);

export class ReadonlyThreadRuntimeCore
  extends BaseSubscribable
  implements ThreadRuntimeCore
{
  private _messages: readonly ThreadMessage[] = [];

  get messages() {
    return this._messages;
  }

  setMessages(messages: readonly ThreadMessage[]) {
    if (this._messages === messages) return;
    this._messages = messages;
    this._notifySubscribers();
  }

  getMessageById(messageId: string) {
    const idx = this._messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return undefined;
    return {
      parentId: this._messages[idx - 1]?.id ?? null,
      message: this._messages[idx]!,
      index: idx,
    };
  }

  getBranches(messageId: string) {
    // no branching in readonly threads
    const idx = this._messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return [];
    return [messageId];
  }

  switchToBranch(): void {
    throw READONLY_THREAD_ERROR;
  }

  append(): void {
    throw READONLY_THREAD_ERROR;
  }

  startRun(): void {
    throw READONLY_THREAD_ERROR;
  }

  resumeRun(): void {
    throw READONLY_THREAD_ERROR;
  }

  cancelRun(): void {
    // noop - nothing to cancel
  }

  addToolResult(): void {
    throw READONLY_THREAD_ERROR;
  }

  resumeToolCall(): void {
    throw READONLY_THREAD_ERROR;
  }

  speak(): void {
    throw READONLY_THREAD_ERROR;
  }

  stopSpeaking(): void {
    // noop
  }

  submitFeedback(): void {
    throw READONLY_THREAD_ERROR;
  }

  getModelContext() {
    return {};
  }

  exportExternalState() {
    throw READONLY_THREAD_ERROR;
  }

  importExternalState(): void {
    throw READONLY_THREAD_ERROR;
  }

  unstable_loadExternalState(): void {
    throw READONLY_THREAD_ERROR;
  }

  composer = {
    attachments: [] as never[],
    attachmentAccept: "*",

    async addAttachment() {
      throw READONLY_THREAD_ERROR;
    },

    async removeAttachment() {
      throw READONLY_THREAD_ERROR;
    },

    isEditing: false as const,
    canCancel: false,
    isEmpty: true,
    text: "",

    setText() {
      throw READONLY_THREAD_ERROR;
    },

    role: "user" as const,

    setRole() {
      throw READONLY_THREAD_ERROR;
    },

    runConfig: {},

    setRunConfig() {
      throw READONLY_THREAD_ERROR;
    },

    async reset() {
      // noop
    },

    async clearAttachments() {
      // noop
    },

    send() {
      throw READONLY_THREAD_ERROR;
    },

    cancel() {
      // noop
    },

    dictation: undefined,

    startDictation() {
      throw READONLY_THREAD_ERROR;
    },

    stopDictation() {
      // noop
    },

    quote: undefined,

    setQuote() {
      throw READONLY_THREAD_ERROR;
    },

    subscribe() {
      return () => {};
    },

    unstable_on() {
      return () => {};
    },
  };

  getEditComposer() {
    return undefined;
  }

  beginEdit(): void {
    throw READONLY_THREAD_ERROR;
  }

  speech = undefined;

  capabilities = {
    switchToBranch: false,
    switchBranchDuringRun: false,
    edit: false,
    reload: false,
    cancel: false,
    unstable_copy: false,
    speech: false,
    dictation: false,
    attachments: false,
    feedback: false,
    queue: false,
  } as const;

  isDisabled = false;
  isLoading = false;

  state = null;
  suggestions = [] as never[];
  extras = undefined;

  import(): void {
    throw READONLY_THREAD_ERROR;
  }

  export() {
    return {
      messages: this._messages.map((message, idx) => ({
        message,
        parentId: this._messages[idx - 1]?.id ?? null,
      })),
    };
  }

  reset(): void {
    throw READONLY_THREAD_ERROR;
  }

  unstable_on(): Unsubscribe {
    return () => {};
  }
}
