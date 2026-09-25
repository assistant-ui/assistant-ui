import { BaseAssistantRuntimeCore } from "../../runtime/base/base-assistant-runtime-core";
import { ExternalStoreThreadListRuntimeCore } from "./external-store-thread-list-runtime-core";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const getThreadListAdapter = (store: ExternalStoreAdapter<any>) => {
  return store.adapters?.threadList ?? {};
};

export class ExternalStoreRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threads;
  private _adapter: ExternalStoreAdapter<any>;

  constructor(adapter: ExternalStoreAdapter<any>) {
    super();
    this._adapter = adapter;
    this.threads = new ExternalStoreThreadListRuntimeCore(
      getThreadListAdapter(adapter),
      () =>
        new ExternalStoreThreadRuntimeCore(
          this._contextProvider,
          this._adapter,
        ),
    );
  }

  public setAdapter(adapter: ExternalStoreAdapter<any>) {
    // Before the thread list, whose thread switch builds the new main thread
    // from this adapter.
    this._adapter = adapter;
    this.threads.__internal_setAdapter(getThreadListAdapter(adapter));
    this.threads.getMainThreadRuntimeCore().__internal_setAdapter(adapter);
  }
}
