import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { AssistantRuntimeCore } from "./AssistantRuntimeCore";
import { ProxyConfigProvider } from "../../utils/ProxyConfigProvider";
import { ThreadManagerRuntimeCore } from "./ThreadManagerRuntimeCore";

export abstract class BaseAssistantRuntimeCore implements AssistantRuntimeCore {
  protected readonly _proxyConfigProvider = new ProxyConfigProvider();
  public abstract get threadManager(): ThreadManagerRuntimeCore;

  constructor() {}

  public registerModelConfigProvider(
    provider: ModelConfigProvider,
  ): Unsubscribe {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }
}
