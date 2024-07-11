import { AddToolResultOptions } from "../../context";
import type { AppendMessage } from "../../types/AssistantTypes";
import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { AssistantRuntime } from "./AssistantRuntime";
import { ReactThreadRuntime } from "./ReactThreadRuntime";

export abstract class BaseAssistantRuntime<
  TThreadRuntime extends ReactThreadRuntime,
> implements AssistantRuntime
{
  public get capabilities() {
    return this._thread.capabilities;
  }

  constructor(private _thread: TThreadRuntime) {
    this._thread = _thread;
    this._unsubscribe = this._thread.subscribe(this.subscriptionHandler);
  }

  private _unsubscribe: Unsubscribe;

  get thread() {
    return this._thread;
  }

  set thread(thread: TThreadRuntime) {
    this._unsubscribe();
    this._thread = thread;
    this._unsubscribe = this._thread.subscribe(this.subscriptionHandler);
    this.subscriptionHandler();
  }

  public abstract registerModelConfigProvider(
    provider: ModelConfigProvider,
  ): Unsubscribe;
  public abstract switchToThread(threadId: string | null): void;

  public get messages() {
    return this.thread.messages;
  }

  public get isRunning() {
    return this.thread.isRunning;
  }

  public getBranches(messageId: string): readonly string[] {
    return this.thread.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    return this.thread.switchToBranch(branchId);
  }

  public append(message: AppendMessage): void {
    return this.thread.append(message);
  }

  public startRun(parentId: string | null): void {
    return this.thread.startRun(parentId);
  }

  public cancelRun(): void {
    return this.thread.cancelRun();
  }

  public addToolResult(options: AddToolResultOptions) {
    return this.thread.addToolResult(options);
  }

  private _subscriptions = new Set<() => void>();

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private subscriptionHandler = () => {
    for (const callback of this._subscriptions) callback();
  };

  public get unstable_synchronizer() {
    return this.thread.unstable_synchronizer;
  }
}
