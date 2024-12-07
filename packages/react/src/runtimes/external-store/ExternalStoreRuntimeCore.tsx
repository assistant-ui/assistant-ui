import { BaseAssistantRuntimeCore } from "../../internal";
import { ExternalStoreThreadListRuntimeCore } from "./ExternalStoreThreadListRuntimeCore";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { ExternalStoreThreadRuntimeCore } from "./ExternalStoreThreadRuntimeCore";

const getThreadListAdapter = (store: ExternalStoreAdapter<any>) => {
  return {
    ...store.adapters?.threadList,
  };
};

export class ExternalStoreRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threadList;

  constructor(store: ExternalStoreAdapter<any>) {
    super();
    this.threadList = new ExternalStoreThreadListRuntimeCore(
      getThreadListAdapter(store),
      () =>
        new ExternalStoreThreadRuntimeCore(this._proxyConfigProvider, store),
    );
  }

  public setStore(store: ExternalStoreAdapter<any>) {
    // Update the thread list adapter and propagate store changes to the main thread
    this.threadList.__internal_setAdapter(getThreadListAdapter(store));
    this.threadList.getMainThreadRuntimeCore().__internal_setStore(store);
  }
}
