import type { ThreadMessage } from "../../types/message";
import {
  MessageRepository,
  type ExportedMessageRepository,
} from "./message-repository";

export type MessageRepositorySessionOptions = {
  decorateExport?: (
    exported: ExportedMessageRepository,
    repository: MessageRepository,
  ) => ExportedMessageRepository;
};

export const createMessageRepositorySession = (
  options: MessageRepositorySessionOptions = {},
) => {
  const repository = new MessageRepository();
  let exportedRepository: ExportedMessageRepository | undefined;

  const getMessages = (): readonly ThreadMessage[] => {
    return repository.getMessages();
  };

  const tryGetMessage = (messageId: string) => {
    try {
      return repository.getMessage(messageId);
    } catch {
      return undefined;
    }
  };

  const tryGetMessages = (
    messageId: string,
  ): readonly ThreadMessage[] | undefined => {
    try {
      return repository.getMessages(messageId);
    } catch {
      return undefined;
    }
  };

  const hasMessage = (messageId: string): boolean => {
    return tryGetMessage(messageId) !== undefined;
  };

  const addOrUpdateMessage = (
    parentId: string | null,
    message: ThreadMessage,
  ): void => {
    repository.addOrUpdateMessage(parentId, message);
    exportedRepository = undefined;
  };

  const deleteMessage = (
    messageId: string,
    replacementId?: string | null,
  ): void => {
    repository.deleteMessage(messageId, replacementId);
    exportedRepository = undefined;
  };

  const tryDeleteMessage = (messageId: string): boolean => {
    if (!hasMessage(messageId)) return false;
    deleteMessage(messageId);
    return true;
  };

  const switchToBranch = (messageId: string): void => {
    repository.switchToBranch(messageId);
    exportedRepository = undefined;
  };

  const resetHead = (messageId: string | null): void => {
    repository.resetHead(messageId);
    exportedRepository = undefined;
  };

  const clear = (): void => {
    repository.clear();
    exportedRepository = undefined;
  };

  const updateMessage = (
    messageId: string,
    updater: (message: ThreadMessage) => ThreadMessage,
  ): boolean => {
    const item = tryGetMessage(messageId);
    if (!item) return false;
    const message = updater(item.message);
    if (message === item.message) return false;
    addOrUpdateMessage(item.parentId, message);
    return true;
  };

  const applyExternalMessageRepository = (
    loaded: ExportedMessageRepository,
  ): void => {
    const headId = loaded.headId ?? loaded.messages.at(-1)?.message.id ?? null;
    const ids = new Set<string>();
    let degenerate = false;
    for (const { message } of loaded.messages) {
      if (ids.has(message.id)) {
        degenerate = true;
        break;
      }
      ids.add(message.id);
    }
    if (headId !== null && !ids.has(headId)) degenerate = true;

    if (!degenerate) {
      clear();
      let pending = [...loaded.messages];
      const importedIds = new Set<string>();

      while (pending.length > 0) {
        const unresolved: typeof pending = [];
        let progressed = false;
        for (const item of pending) {
          if (item.parentId !== null && !importedIds.has(item.parentId)) {
            unresolved.push(item);
            continue;
          }
          addOrUpdateMessage(item.parentId, item.message);
          importedIds.add(item.message.id);
          progressed = true;
        }
        if (!progressed) {
          degenerate = true;
          break;
        }
        pending = unresolved;
      }
    }

    if (degenerate) {
      clear();
      let previousId: string | null = null;
      for (const { message } of loaded.messages) {
        const existing = tryGetMessage(message.id);
        addOrUpdateMessage(existing ? existing.parentId : previousId, message);
        previousId = message.id;
      }
      resetHead(previousId);
    } else {
      resetHead(headId);
    }
  };

  return {
    getMessages,
    get headId() {
      return repository.headId;
    },
    export: (): ExportedMessageRepository => {
      exportedRepository ??= options.decorateExport
        ? options.decorateExport(repository.export(), repository)
        : repository.export();
      return exportedRepository;
    },
    tryGetMessage,
    tryGetMessages,
    hasMessage,
    addOrUpdateMessage,
    deleteMessage,
    tryDeleteMessage,
    switchToBranch,
    resetHead,
    clear,
    updateMessage,
    applyExternalMessageRepository,
  };
};

export type MessageRepositorySession = ReturnType<
  typeof createMessageRepositorySession
>;
