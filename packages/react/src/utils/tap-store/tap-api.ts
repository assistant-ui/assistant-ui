import { tapEffect, tapMemo, tapRef } from "@assistant-ui/tap";

export interface ApiObject {
  [key: string]: ((...args: any[]) => any) | ApiObject;
}

class ReadonlyApiHandler<TApi extends ApiObject> implements ProxyHandler<TApi> {
  constructor(private readonly getApi: () => TApi) {}

  get(_: unknown, prop: string | symbol) {
    return this.getApi()[prop as keyof TApi];
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.getApi() as object);
  }

  has(_: unknown, prop: string | symbol) {
    return prop in (this.getApi() as object);
  }

  getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    return Object.getOwnPropertyDescriptor(this.getApi(), prop);
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

export const tapApi = <TApi extends ApiObject & { getState: () => any }>(
  api: TApi,
  options?: {
    key?: string | undefined;
  },
) => {
  const ref = tapRef(() => api);
  tapEffect(() => {
    ref.current = api;
  });

  const apiProxy = tapMemo(
    () =>
      new Proxy<TApi>({} as TApi, new ReadonlyApiHandler(() => ref.current)),
    [],
  );

  const key = options?.key;
  const state = api.getState();

  return tapMemo(
    () => ({
      key,
      state,
      api: apiProxy,
    }),
    [state, key],
  );
};
