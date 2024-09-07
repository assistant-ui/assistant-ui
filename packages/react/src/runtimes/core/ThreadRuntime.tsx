import { Attachment } from "../../context/stores/Attachment";
import { RuntimeCapabilities } from "../../context/stores/Thread";
import { ThreadActionsState } from "../../context/stores/ThreadActions";
import { ThreadMessage } from "../../types";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type ThreadRuntime = ThreadActionsState &
  Readonly<{
    composer: ThreadRuntime.Composer;
    capabilities: Readonly<RuntimeCapabilities>;
    threadId: string;
    isDisabled: boolean;
    messages: readonly ThreadMessage[];
    subscribe: (callback: () => void) => Unsubscribe;
  }>;

export declare namespace ThreadRuntime {
  export type Composer = Readonly<{
    attachments: Attachment[];
    addAttachment: (attachment: Attachment) => void;
    removeAttachment: (attachmentId: string) => void;

    text: string;
    setText: (value: string) => void;

    reset: () => void;
  }>;
}
