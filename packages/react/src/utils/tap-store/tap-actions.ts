import { tapRef, tapEffect, tapMemo, RefObject } from "@assistant-ui/tap";

class ReadonlyRefProxyHandler<T extends object> implements ProxyHandler<T> {
  constructor(private ref: RefObject<T>) {}

  get(_: T, prop: string | symbol) {
    return this.ref.current[prop as keyof T];
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.ref.current);
  }

  has(_: T, prop: string | symbol) {
    return prop in this.ref.current;
  }

  getOwnPropertyDescriptor(_: T, prop: string | symbol) {
    return Object.getOwnPropertyDescriptor(this.ref.current, prop);
  }

  getPrototypeOf() {
    return Object.getPrototypeOf(this.ref.current);
  }
}

export interface ActionsObject {
  [key: string]: ((...args: any[]) => any) | ActionsObject;
}

export const tapActions = <T extends ActionsObject>(inner: T) => {
  const ref = tapRef(inner);
  tapEffect(() => {
    ref.current = inner;
  });

  return tapMemo(() => {
    return new Proxy({} as T, new ReadonlyRefProxyHandler(ref));
  }, []);
};
