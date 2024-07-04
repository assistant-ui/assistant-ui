"use client";

import { INTERNAL } from "@assistant-ui/react";
import type { VercelRSCAdapter } from "./VercelRSCAdapter";
import type { VercelRSCMessage } from "./VercelRSCMessage";
import { ModelConfigProvider } from "@assistant-ui/react";
import {
  VercelRSCThreadRuntime,
  ProxyConfigProvider,
} from "./VercelRSCThreadRuntime";

const { BaseAssistantRuntime } = INTERNAL;

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
