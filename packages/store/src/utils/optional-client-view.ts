import type { AssistantClient, ClientNames } from "../types/client";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";
import { isScopeAvailable } from "./client-accessor";
import { clientScopeKeys, isIgnoredClientKey } from "./client-keys";

class OptionalClientViewProxyHandler
  extends BaseProxyHandler
  implements ProxyHandler<AssistantClient["optional"]>
{
  readonly #client: AssistantClient;

  constructor(client: AssistantClient) {
    super();
    this.#client = client;
  }

  get(_: unknown, prop: string | symbol) {
    const introspection = handleIntrospectionProp(
      prop,
      "OptionalAssistantClient",
    );
    if (introspection !== false) return introspection;
    if (isIgnoredClientKey(prop)) return undefined;
    const accessor = this.#client[prop as ClientNames];
    return isScopeAvailable(accessor) ? accessor : undefined;
  }

  ownKeys(): ArrayLike<string | symbol> {
    return clientScopeKeys(this.#client);
  }

  has(_: unknown, prop: string | symbol): boolean {
    return !isIgnoredClientKey(prop) && prop in this.#client;
  }
}

export const createOptionalClientView = (
  client: AssistantClient,
): AssistantClient["optional"] =>
  new Proxy<AssistantClient["optional"]>(
    {} as AssistantClient["optional"],
    new OptionalClientViewProxyHandler(client),
  );
