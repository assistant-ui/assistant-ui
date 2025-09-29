/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import {
  FC,
  useCallback,
  useRef,
  useEffect,
  memo,
  PropsWithChildren,
  ComponentType,
} from "react";
import { UseBoundStore, StoreApi, create } from "zustand";
import { useAssistantApi, ThreadListItemByIdProvider } from "../../../context";
import { ThreadRuntimeCore, ThreadRuntimeImpl } from "../../../internal";
import { BaseSubscribable } from "./BaseSubscribable";
import { AssistantRuntime } from "../../runtime";

type RemoteThreadListHook = () => AssistantRuntime;

type RemoteThreadListHookInstance = {
  runtime?: ThreadRuntimeCore;
};
export class RemoteThreadListHookInstanceManager extends BaseSubscribable {
  private useRuntimeHook: UseBoundStore<
    StoreApi<{ useRuntime: RemoteThreadListHook }>
  >;
  private instances = new Map<string, RemoteThreadListHookInstance>();
  private useAliveThreadsKeysChanged = create(() => ({}));

  constructor(runtimeHook: RemoteThreadListHook) {
    super();
    this.useRuntimeHook = create(() => ({ useRuntime: runtimeHook }));
  }

  public startThreadRuntime(threadId: string) {
    if (!this.instances.has(threadId)) {
      this.instances.set(threadId, {});
      this.useAliveThreadsKeysChanged.setState({}, true);
    }

    return new Promise<ThreadRuntimeCore>((resolve, reject) => {
      const callback = () => {
        const instance = this.instances.get(threadId);
        if (!instance) {
          dispose();
          reject(new Error("Thread was deleted before runtime was started"));
        } else if (!instance.runtime) {
          return; // misc update
        } else {
          dispose();
          resolve(instance.runtime);
        }
      };
      const dispose = this.subscribe(callback);
      callback();
    });
  }

  public getThreadRuntimeCore(threadId: string) {
    const instance = this.instances.get(threadId);
    if (!instance) return undefined;
    return instance.runtime;
  }

  public stopThreadRuntime(threadId: string) {
    this.instances.delete(threadId);
    this.useAliveThreadsKeysChanged.setState({}, true);
  }

  public setRuntimeHook(newRuntimeHook: RemoteThreadListHook) {
    const prevRuntimeHook = this.useRuntimeHook.getState().useRuntime;
    if (prevRuntimeHook !== newRuntimeHook) {
      this.useRuntimeHook.setState({ useRuntime: newRuntimeHook }, true);
    }
  }

  private _InnerActiveThreadProvider: FC<{
    threadId: string;
  }> = ({ threadId }) => {
    const { useRuntime } = this.useRuntimeHook();
    const runtime = useRuntime();

    const threadBinding = (runtime.thread as ThreadRuntimeImpl)
      .__internal_threadBinding;

    const updateRuntime = useCallback(() => {
      const aliveThread = this.instances.get(threadId);
      if (!aliveThread)
        throw new Error("Thread not found. This is a bug in assistant-ui.");

      aliveThread.runtime = threadBinding.getState();
      this._notifySubscribers();
    }, [threadId, threadBinding]);

    const isMounted = useRef(false);
    if (!isMounted.current) {
      updateRuntime();
    }

    useEffect(() => {
      isMounted.current = true;
      updateRuntime();
      return threadBinding.outerSubscribe(updateRuntime);
    }, [threadBinding, updateRuntime]);

    // auto initialize thread
    const api = useAssistantApi();
    useEffect(() => {
      return runtime.threads.main.unstable_on("initialize", () => {
        const state = api.threadListItem().getState();
        if (state.status === "new") {
          api.threadListItem().initialize();

          // auto generate a title after first run
          const dispose = runtime.thread.unstable_on("run-end", () => {
            dispose();

            api.threadListItem().generateTitle();
          });
        }
      });
    }, [runtime, api]);

    return null;
  };

  private _OuterActiveThreadProvider: FC<{
    threadId: string;
    provider: ComponentType<PropsWithChildren>;
    // eslint-disable-next-line react/display-name
  }> = memo(({ threadId, provider: Provider }) => {
    // Runtime is provided by ThreadListItemByIdProvider

    return (
      <ThreadListItemByIdProvider id={threadId}>
        <Provider>
          <this._InnerActiveThreadProvider threadId={threadId} />
        </Provider>
      </ThreadListItemByIdProvider>
    );
  });

  public __internal_RenderThreadRuntimes: FC<{
    provider: ComponentType<PropsWithChildren>;
  }> = ({ provider }) => {
    this.useAliveThreadsKeysChanged(); // trigger re-render on alive threads change

    return Array.from(this.instances.keys()).map((threadId) => (
      <this._OuterActiveThreadProvider
        key={threadId}
        threadId={threadId}
        provider={provider}
      />
    ));
  };
}
