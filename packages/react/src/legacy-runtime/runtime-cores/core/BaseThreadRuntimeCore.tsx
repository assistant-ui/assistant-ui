import {
  BaseThreadRuntimeCore as CoreBaseThreadRuntimeCore,
  type BaseThreadAdapters,
  type ThreadComposerRuntimeCore,
  type ComposerRuntimeCore,
} from "@assistant-ui/core";
import type { ModelContextProvider } from "../../../model-context";
import { DefaultThreadComposerRuntimeCore } from "../composer/DefaultThreadComposerRuntimeCore";
import { DefaultEditComposerRuntimeCore } from "../composer/DefaultEditComposerRuntimeCore";

// Re-export the type from core
export type { BaseThreadAdapters };

/**
 * React-specific implementation of BaseThreadRuntimeCore that provides
 * concrete implementations for composer and edit composer.
 */
export abstract class BaseThreadRuntimeCore extends CoreBaseThreadRuntimeCore {
  public readonly composer: ThreadComposerRuntimeCore;
  private _editComposers = new Map<string, DefaultEditComposerRuntimeCore>();

  constructor(contextProvider: ModelContextProvider) {
    super(contextProvider);
    this.composer = new DefaultThreadComposerRuntimeCore(this);
  }

  public getEditComposer(messageId: string): ComposerRuntimeCore | undefined {
    return this._editComposers.get(messageId);
  }

  public beginEdit(messageId: string): void {
    if (this._editComposers.has(messageId))
      throw new Error("Edit already in progress");

    this._editComposers.set(
      messageId,
      new DefaultEditComposerRuntimeCore(
        this,
        () => this._editComposers.delete(messageId),
        this.repository.getMessage(messageId),
      ),
    );
    this._notifySubscribers();
  }
}
