"use client";

import {
  INTERNAL,
  type AppendMessage,
  type ReactThreadRuntime,
  type ThreadMessage,
  type Unsubscribe,
} from "@assistant-ui/react";
import { type StoreApi, type UseBoundStore, create } from "zustand";
import type { VercelRSCAdapter } from "./VercelRSCAdapter";
import type { VercelRSCMessage } from "./VercelRSCMessage";
import { useVercelRSCSync } from "./useVercelRSCSync";
import { ModelConfigProvider } from "@assistant-ui/react";

const { ProxyConfigProvider, BaseAssistantRuntime } = INTERNAL;

const EMPTY_BRANCHES: readonly string[] = Object.freeze([]);

export class VercelRSCRuntime<
  T extends WeakKey = VercelRSCMessage,
> extends BaseAssistantRuntime<VercelRSCThreadRuntime<T>> {
  private readonly _proxyConfigProvider = new ProxyConfigProvider();

  constructor(adapter: VercelRSCAdapter<T>) {
    super(new VercelRSCThreadRuntime(adapter));
  }

  public set adapter(adapter: VercelRSCAdapter<T>) {
    this.thread.adapter = adapter;
  }

  public onAdapterUpdated() {
    return this.thread.onAdapterUpdated();
  }

  public getModelConfig() {
    return this._proxyConfigProvider.getModelConfig();
  }

  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }

  public switchToThread() {
    throw new Error("VercelRSCRuntime does not support switching threads");
  }
}

class VercelRSCThreadRuntime<T extends WeakKey = VercelRSCMessage>
  implements ReactThreadRuntime
{
  private useAdapter: UseBoundStore<StoreApi<{ adapter: VercelRSCAdapter<T> }>>;

  private _subscriptions = new Set<() => void>();

  public isRunning = false;
  public messages: ThreadMessage[] = [];

  constructor(public adapter: VercelRSCAdapter<T>) {
    this.useAdapter = create(() => ({
      adapter,
    }));
  }

  private withRunning = (callback: Promise<unknown>) => {
    this.isRunning = true;
    return callback.finally(() => {
      this.isRunning = false;
    });
  };

  public getBranches(): readonly string[] {
    return EMPTY_BRANCHES;
  }

  public switchToBranch(): void {
    throw new Error(
      "Branch switching is not supported by VercelRSCAssistantProvider.",
    );
  }

  public async append(message: AppendMessage): Promise<void> {
    if (message.parentId !== (this.messages.at(-1)?.id ?? null)) {
      if (!this.adapter.edit)
        throw new Error(
          "Message editing is not enabled, please provide an edit callback to VercelRSCAssistantProvider.",
        );
      await this.withRunning(this.adapter.edit(message));
    } else {
      await this.withRunning(this.adapter.append(message));
    }
  }

  public async startRun(parentId: string | null): Promise<void> {
    if (!this.adapter.reload)
      throw new Error(
        "Message reloading is not enabled, please provide a reload callback to VercelRSCAssistantProvider.",
      );
    await this.withRunning(this.adapter.reload(parentId));
  }

  cancelRun(): void {
    // in dev mode, log a warning
    if (process.env["NODE_ENV"] === "development") {
      console.warn(
        "Run cancellation is not supported by VercelRSCAssistantProvider.",
      );
    }
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  public onAdapterUpdated() {
    if (this.useAdapter.getState().adapter !== this.adapter) {
      this.useAdapter.setState({ adapter: this.adapter });
    }
  }

  private updateData = (messages: ThreadMessage[]) => {
    this.messages = messages;
    for (const callback of this._subscriptions) callback();
  };

  unstable_synchronizer = () => {
    const { adapter } = this.useAdapter();

    useVercelRSCSync(adapter, this.updateData);

    return null;
  };

  addToolResult() {
    throw new Error("VercelRSCRuntime does not support adding tool results");
  }
}
