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

  private _store: ExternalStoreAdapter<any>;

  constructor(store: ExternalStoreAdapter<any>) {
    super();
    this._store = store;
    this.threadList = new ExternalStoreThreadListRuntimeCore(
      getThreadListAdapter(store),
      (threadId) =>
        new ExternalStoreThreadRuntimeCore(
          this._proxyConfigProvider,
          threadId,
          this._store,
        ),
    );
  }

  public setStore(store: ExternalStoreAdapter<any>) {
    this._store = store;
    this.threadList.setAdapter(getThreadListAdapter(store));
    this.threadList.mainThread.setStore(store);
  }
}
