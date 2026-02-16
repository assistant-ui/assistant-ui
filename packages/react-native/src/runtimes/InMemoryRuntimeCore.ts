import type { ThreadMessageLike } from "@assistant-ui/core";
import type { LocalRuntimeOptionsBase } from "@assistant-ui/core/internal";
import {
  BaseAssistantRuntimeCore,
  LocalThreadRuntimeCore,
  ExportedMessageRepository,
} from "@assistant-ui/core/internal";
import { InMemoryThreadListRuntimeCore } from "./InMemoryThreadListRuntimeCore";

export class InMemoryRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threads: InMemoryThreadListRuntimeCore;
  public readonly Provider = undefined;

  private _options: LocalRuntimeOptionsBase;

  constructor(
    options: LocalRuntimeOptionsBase,
    initialMessages: readonly ThreadMessageLike[] | undefined,
  ) {
    super();

    this._options = options;

    this.threads = new InMemoryThreadListRuntimeCore(() => {
      return new LocalThreadRuntimeCore(this._contextProvider, this._options);
    });

    if (initialMessages) {
      this.threads
        .getMainThreadRuntimeCore()
        .import(ExportedMessageRepository.fromArray(initialMessages));
    }
  }
}
