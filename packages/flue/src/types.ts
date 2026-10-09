import type {
  AppendMessage,
  AttachmentAdapter,
  DictationAdapter,
  ExternalStoreSharedOptions,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  SpeechSynthesisAdapter,
} from "@assistant-ui/core";
import type {
  DeliveredAttachment,
  FlueConversationMessage,
  FlueConversationSettlement,
  SendMessageOptions,
  UseFlueAgentOptions,
  UseFlueAgentResult,
} from "@flue/react";

export type ConvertFlueMessagesOptions = {
  readonly error?: unknown;
  readonly isRunning?: boolean | undefined;
  readonly settlements?: readonly FlueConversationSettlement[] | undefined;
  readonly getCreatedAt?:
    | ((message: FlueConversationMessage) => Date)
    | undefined;
};

export type FlueSendMessage = {
  readonly message: string;
  readonly images?: readonly DeliveredAttachment[] | undefined;
};

export type FlueRuntimeExtras = Pick<
  UseFlueAgentResult,
  | "error"
  | "failedSends"
  | "historyReady"
  | "messages"
  | "refresh"
  | "settlements"
  | "status"
>;

type FlueSendOptions = Omit<SendMessageOptions, "images">;

export type UseFlueRuntimeOptions = UseFlueAgentOptions &
  ExternalStoreSharedOptions & {
    readonly adapters?:
      | {
          readonly attachments?: AttachmentAdapter | undefined;
          readonly speech?: SpeechSynthesisAdapter | undefined;
          readonly dictation?: DictationAdapter | undefined;
          readonly voice?: RealtimeVoiceAdapter | undefined;
          readonly feedback?: FeedbackAdapter | undefined;
        }
      | undefined;
    readonly getSendOptions?:
      | ((message: AppendMessage) => FlueSendOptions | undefined)
      | undefined;
  };
