import {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../utils/MessageRepository";

export type ThreadHistoryAdapter = {
  load(): Promise<ExportedMessageRepository>;
  append(item: ExportedMessageRepositoryItem): Promise<void>;
};
