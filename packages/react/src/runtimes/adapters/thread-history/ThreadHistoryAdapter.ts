import { ChatModelRunOptions, ChatModelRunResult } from "../../local";
import {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../utils/MessageRepository";

export type ThreadHistoryAdapter = {
  load(): Promise<ExportedMessageRepository & { unstable_resume?: boolean }>;
  resume?(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void, unknown>;
  append(item: ExportedMessageRepositoryItem): Promise<void>;
};
