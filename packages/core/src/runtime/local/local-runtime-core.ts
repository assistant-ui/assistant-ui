import { BaseAssistantRuntimeCore } from "../base/base-assistant-runtime-core";
import { LocalThreadRuntimeCore } from "./local-thread-runtime-core";
import type { LocalRuntimeOptionsBase } from "./local-runtime-options";
import { LocalThreadListRuntimeCore } from "./local-thread-list-runtime-core";
import { ExportedMessageRepository } from "../shared/message-repository";
import type { ThreadMessageLike } from "../shared/thread-message-like";

export class LocalRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threads;
  public readonly Provider = undefined;

  private _options: LocalRuntimeOptionsBase;

  constructor(
    options: LocalRuntimeOptionsBase,
    initialMessages: readonly ThreadMessageLike[] | undefined,
  ) {
    super();

    this._options = options;

    this.threads = new LocalThreadListRuntimeCore(() => {
      return new LocalThreadRuntimeCore(this._contextProvider, this._options);
    });

    if (initialMessages) {
      this.threads
        .getMainThreadRuntimeCore()
        .import(ExportedMessageRepository.fromArray(initialMessages));
    }
  }
}
