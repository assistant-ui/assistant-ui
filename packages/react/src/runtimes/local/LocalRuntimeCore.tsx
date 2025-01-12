import type { CoreMessage } from "../../types/AssistantTypes";
import { BaseAssistantRuntimeCore } from "../core/BaseAssistantRuntimeCore";
import { LocalThreadRuntimeCore } from "./LocalThreadRuntimeCore";
import { LocalRuntimeOptionsBase } from "./LocalRuntimeOptions";
import { LocalThreadListRuntimeCore } from "./LocalThreadListRuntimeCore";
import { ExportedMessageRepository } from "../utils/MessageRepository";
import { ThreadMessageLike } from "../external-store";
import { fromThreadMessageLike } from "../external-store/ThreadMessageLike";
import { generateId } from "../../internal";
import { getAutoStatus } from "../external-store/auto-status";

const getExportFromInitialMessages = (
  initialMessages: readonly ThreadMessageLike[],
): ExportedMessageRepository => {
  const messages = initialMessages.map((i, idx) => {
    const isLast = idx === initialMessages.length - 1;
    return fromThreadMessageLike(i, generateId(), getAutoStatus(isLast, false));
  });
  return {
    messages: messages.map((m, idx) => ({
      parentId: messages[idx - 1]?.id ?? null,
      message: m,
    })),
  };
};

export class LocalRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threadList;
  public readonly Provider = undefined;

  private _options: LocalRuntimeOptionsBase;

  constructor(
    options: LocalRuntimeOptionsBase,
    initialMessages: readonly ThreadMessageLike[] | undefined,
  ) {
    super();

    this._options = options;

    this.threadList = new LocalThreadListRuntimeCore(() => {
      return new LocalThreadRuntimeCore(
        this._proxyConfigProvider,
        this._options,
      );
    });

    if (initialMessages) {
      this.threadList
        .getMainThreadRuntimeCore()
        .import(getExportFromInitialMessages(initialMessages));
    }
  }

  public reset({
    initialMessages,
  }: {
    initialMessages?: readonly CoreMessage[] | undefined;
  } = {}) {
    this.threadList.switchToNewThread();
    if (!initialMessages) return;

    this.threadList
      .getMainThreadRuntimeCore()
      .import(getExportFromInitialMessages(initialMessages));
  }
}
