import { BaseAssistantRuntimeCore } from "../../internal";
import { ExternalStoreThreadListRuntimeCore } from "./ExternalStoreThreadListRuntimeCore";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { ExternalStoreThreadRuntimeCore } from "./ExternalStoreThreadRuntimeCore";
import { Fragment } from "react/jsx-runtime";
import { PropsWithChildren } from "react";
import { create } from "zustand";

const getThreadListAdapter = (store: ExternalStoreAdapter<any>) => {
  return {
    ...store.adapters?.threadList,
  };
};

export class ExternalStoreRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threadList;

  private useRenderComponent;

  constructor(adapter: ExternalStoreAdapter<any>) {
    super();
    this.useRenderComponent = create(() => ({
      RenderComponent: adapter.unstable_Provider ?? Fragment,
    }));
    this.threadList = new ExternalStoreThreadListRuntimeCore(
      getThreadListAdapter(adapter),
      () =>
        new ExternalStoreThreadRuntimeCore(this._proxyConfigProvider, adapter),
    );
  }

  public setAdapter(adapter: ExternalStoreAdapter<any>) {
    // Update the thread list adapter and propagate store changes to the main thread
    this.threadList.__internal_setAdapter(getThreadListAdapter(adapter));
    this.threadList.getMainThreadRuntimeCore().__internal_setAdapter(adapter);

    const RenderComponent = adapter.unstable_Provider ?? Fragment;
    if (
      RenderComponent !== this.useRenderComponent.getState().RenderComponent
    ) {
      this.useRenderComponent.setState({ RenderComponent }, true);
    }
  }

  public readonly Provider = ({ children }: PropsWithChildren) => {
    const RenderComponent = this.useRenderComponent.getState().RenderComponent;
    return <RenderComponent>{children}</RenderComponent>;
  };
}
