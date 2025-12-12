import { tapEffect, tapMemo, tapRef } from "@assistant-ui/tap";

export interface ApiObject {
  [key: string]: ((...args: any[]) => any) | ApiObject;
}

class ReadonlyApiHandler<TApi extends ApiObject> implements ProxyHandler<TApi> {
  constructor(private readonly ref: tapRef.RefObject<TApi>) {}

  get(_: unknown, prop: string | symbol) {
    return this.ref.current[prop as keyof TApi];
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.ref.current as object);
  }

  has(_: unknown, prop: string | symbol) {
    return prop in (this.ref.current as object);
  }

  getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    return Object.getOwnPropertyDescriptor(this.ref.current, prop);
  }

  set() {
    return false;
  }
  setPrototypeOf() {
    return false;
  }
  defineProperty() {
    return false;
  }
  deleteProperty() {
    return false;
  }
  preventExtensions(): boolean {
    return false;
  }
}

export const tapApi = <TApi extends ApiObject & { getState: () => any }>(
  api: TApi,
  options?: {
    key?: string | undefined;
  },
) => {
  const ref = tapRef(api);
  tapEffect(() => {
    ref.current = api;
  });

  const apiProxy = tapMemo(
    () => new Proxy<TApi>({} as TApi, new ReadonlyApiHandler(ref)),
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
