import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { AssistantRuntime } from "./AssistantRuntime";
import { ReactThreadRuntime } from "./ReactThreadRuntime";

export abstract class BaseAssistantRuntime<
  TThreadRuntime extends ReactThreadRuntime,
> implements AssistantRuntime
{
  constructor(private _thread: TThreadRuntime) {
    this._thread = _thread;
  }

  get thread() {
    return this._thread;
  }

  set thread(thread: TThreadRuntime) {
    this._thread = thread;
    this.subscriptionHandler();
  }

  public abstract switchToNewThread(): void;

  public abstract registerModelConfigProvider(
    provider: ModelConfigProvider,
  ): Unsubscribe;
  public abstract switchToThread(threadId: string | null): void;

  private _subscriptions = new Set<() => void>();

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private subscriptionHandler = () => {
    for (const callback of this._subscriptions) callback();
  };
}
