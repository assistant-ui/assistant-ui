import { RuntimeCapabilities } from "../../context/stores/Thread";
import { AppendMessage, ModelConfig, ThreadMessage } from "../../types";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { SpeechSynthesisAdapter } from "../speech";
import { ExportedMessageRepository } from "../utils/MessageRepository";
import { ThreadComposerRuntimeCore } from "./ThreadComposerRuntimeCore";

export type AddToolResultOptions = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  result: any;
};

export type SubmitFeedbackOptions = {
  messageId: string;
  type: "negative" | "positive";
};

export type ThreadRuntimeCore = Readonly<{
  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;

  addToolResult: (options: AddToolResultOptions) => void;

  speak: (messageId: string) => SpeechSynthesisAdapter.Utterance;

  submitFeedback: (feedback: SubmitFeedbackOptions) => void;

  getModelConfig: () => ModelConfig;

  composer: ThreadComposerRuntimeCore;
  capabilities: Readonly<RuntimeCapabilities>;
  threadId: string;
  isDisabled: boolean;
  messages: readonly ThreadMessage[];

  subscribe: (callback: () => void) => Unsubscribe;

  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;
}>;
