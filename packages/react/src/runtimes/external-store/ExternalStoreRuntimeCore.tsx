import { BaseAssistantRuntimeCore } from "../../internal";
import { ExternalStoreThreadManagerRuntimeCore } from "./ExternalStoreThreadManagementAdapter";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { ExternalStoreThreadRuntimeCore } from "./ExternalStoreThreadRuntimeCore";

const getThreadManagerAdapter = (store: ExternalStoreAdapter<any>) => {
  return {
    threadId: store.threadId,
    onSwitchToNewThread: store.onSwitchToNewThread,
    onSwitchToThread: store.onSwitchToThread,
    ...store.adapters?.threadManager,
  };
};

export class ExternalStoreRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threadManager;

  private _store: ExternalStoreAdapter<any>;

  constructor(store: ExternalStoreAdapter<any>) {
    super();
    this._store = store;
    this.threadManager = new ExternalStoreThreadManagerRuntimeCore(
      getThreadManagerAdapter(store),
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
    this.threadManager.setAdapter(getThreadManagerAdapter(store));
    this.threadManager.mainThread.setStore(store);
  }
}
