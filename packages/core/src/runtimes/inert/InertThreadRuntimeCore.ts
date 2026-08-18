import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadMessage } from "../../types/message";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import { BaseSubscribable } from "../../subscribable/subscribable";

export const createInertComposer = <TIsEditing extends boolean>(
  error: Error,
  isEditing: TIsEditing,
) => ({
  attachments: [] as never[],
  attachmentAccept: "*",

  async addAttachment() {
    throw error;
  },

  async removeAttachment() {
    throw error;
  },

  isEditing,
  canCancel: false,
  canSend: false,
  isEmpty: true,
  text: "",

  setText() {
    throw error;
  },

  role: "user" as const,

  setRole() {
    throw error;
  },

  runConfig: {},

  setRunConfig() {
    throw error;
  },

  async reset() {},

  async clearAttachments() {},

  send() {
    throw error;
  },

  cancel() {},

  queue: [] as never[],
  moveQueueItem() {},
  removeQueueItem() {},

  dictation: undefined,

  startDictation() {
    throw error;
  },

  stopDictation() {},

  quote: undefined,

  setQuote() {
    throw error;
  },

  subscribe() {
    return () => {};
  },

  unstable_on() {
    return () => {};
  },
});

export abstract class InertThreadRuntimeCore
  extends BaseSubscribable
  implements ThreadRuntimeCore
{
  protected abstract get error(): Error;

  abstract readonly messages: readonly ThreadMessage[];
  abstract readonly isLoading: boolean;
  abstract readonly composer: ThreadRuntimeCore["composer"];

  abstract getMessageById(messageId: string):
    | {
        parentId: string | null;
        message: ThreadMessage;
        index: number;
      }
    | undefined;

  abstract getBranches(messageId: string): readonly string[];

  abstract export(): ExportedMessageRepository;

  switchToBranch(): void {
    throw this.error;
  }

  append(): void {
    throw this.error;
  }

  deleteMessage(): void {
    throw this.error;
  }

  startRun(): void {
    throw this.error;
  }

  resumeRun(): void {
    throw this.error;
  }

  cancelRun(): void {
    throw this.error;
  }

  unstable_notifySessionReset(): void {
    throw this.error;
  }

  addToolResult(): void {
    throw this.error;
  }

  resumeToolCall(): void {
    throw this.error;
  }

  respondToToolApproval(): void {
    throw this.error;
  }

  speak(): void {
    throw this.error;
  }

  stopSpeaking(): void {
    throw this.error;
  }

  connectVoice(): void {
    throw this.error;
  }

  disconnectVoice(): void {
    throw this.error;
  }

  muteVoice(): void {
    throw this.error;
  }

  unmuteVoice(): void {
    throw this.error;
  }

  submitFeedback(): void {
    throw this.error;
  }

  exportExternalState(): void {
    throw this.error;
  }

  importExternalState(): void {
    throw this.error;
  }

  beginEdit(): void {
    throw this.error;
  }

  import(): void {
    throw this.error;
  }

  reset(): void {
    throw this.error;
  }

  getModelContext() {
    return {};
  }

  getEditComposer() {
    return undefined;
  }

  getVoiceVolume = () => 0;
  subscribeVoiceVolume = (): Unsubscribe => () => {};

  speech = undefined;
  voice = undefined;

  capabilities = {
    switchToBranch: false,
    switchBranchDuringRun: false,
    edit: false,
    delete: false,
    reload: false,
    refetchThread: false,
    cancel: false,
    unstable_copy: false,
    speech: false,
    dictation: false,
    voice: false,
    attachments: false,
    feedback: false,
    queue: false,
  } as const;

  isDisabled = false;
  isSendDisabled = false;

  state = null;
  suggestions = [] as never[];
  extras = undefined;

  unstable_on(): Unsubscribe {
    return () => {};
  }
}
