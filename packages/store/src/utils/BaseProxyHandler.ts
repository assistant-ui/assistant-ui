export abstract class BaseProxyHandler implements ProxyHandler<object> {
  abstract get(_: unknown, prop: string | symbol): unknown;
  abstract ownKeys(): ArrayLike<string | symbol>;
  abstract has(_: unknown, prop: string | symbol): boolean;

  getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    const value = this.get(_, prop);
    if (value === undefined) return undefined;
    return {
      value,
      writable: false,
      enumerable: false,
    };
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
