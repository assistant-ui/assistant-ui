import {
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
  tapResource,
  resource,
  tapResources,
} from "@assistant-ui/tap";

/**
 * API object type
 */
export interface ApiObject {
  [key: string]: (...args: any[]) => any;
}

/**
 * Readonly API handler for creating stable proxies
 */
class ReadonlyApiHandler<TState, TApi extends ApiObject>
  implements ProxyHandler<ClientValue<TState, TApi>>
{
  private getState = () => this.getValue().state;
  constructor(private readonly getValue: () => ClientValue<TState, TApi>) {}

  get(_: unknown, prop: string | symbol) {
    if (prop === "getState") return this.getState;
    return this.getValue().api[prop as keyof TApi];
  }

  ownKeys(): ArrayLike<string | symbol> {
    return ["getState", ...Object.keys(this.getValue().api as object)];
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === "getState") return true;
    return prop in (this.getValue().api as object);
  }

  getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    const value = this.get(_, prop);
    if (value === undefined) return undefined;
    return {
      value,
      writable: false,
      enumerable: false,
      configurable: false,
    };
  }

  set() {
    return false;
  }
  defineProperty() {
    return false;
  }
  deleteProperty() {
    return false;
  }
}

type ClientValue<TState, TApi extends ApiObject> = {
  state: TState;
  api: TApi;
  key?: string;
};

export type ApiProxy<TState, TApi extends ApiObject> = TApi & {
  getState: () => TState;
};

/**
 * Wraps a plain resource element to create a stable API proxy.
 *
 * Takes a ResourceElement that returns { state, api, key? } and
 * wraps it to produce { key, state, api } where api is a stable proxy.
 */
export const tapApiResource = <TState, TApi extends ApiObject>(
  element: ResourceElement<{ state: TState; api: TApi; key?: string }>,
): {
  key: string | undefined;
  state: TState;
  api: ApiProxy<TState, TApi>;
} => {
  const value = tapResource(element);

  const valueRef = tapRef(value);
  tapEffect(() => {
    valueRef.current = value;
  });

  // Create stable proxy
  const api = tapMemo(
    () =>
      new Proxy<ApiProxy<TState, TApi>>(
        undefined as unknown as ApiProxy<TState, TApi>,
        new ReadonlyApiHandler<TState, TApi>(() => valueRef.current),
      ),
    [element.type],
  );
  const { key, state } = value;
  return tapMemo(() => ({ key, state, api }), [state, key]);
};

const ApiResource = resource(
  <TState, TApi extends ApiObject>(
    element: ResourceElement<{
      state: TState;
      api: TApi;
      key?: string;
    }>,
  ): {
    key: string | undefined;
    state: TState;
    api: ApiProxy<TState, TApi>;
  } => {
    return tapApiResource(element);
  },
);

export const tapApiResources = <TState, TApi extends ApiObject>(
  elements: ResourceElement<{
    state: TState;
    api: TApi;
    key?: string;
  }>[],
): {
  key: string | undefined;
  state: TState;
  api: ApiProxy<TState, TApi>;
}[] => {
  return tapResources(elements.map((element) => ApiResource(element)));
};
