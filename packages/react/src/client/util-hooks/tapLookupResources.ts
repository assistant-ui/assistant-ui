import { ResourceElement, tapCallback, tapResources } from "@assistant-ui/tap";
import { ActionsObject } from "../../utils/tap-store";
import { tapRefValue } from "./tapRefValue";

type AnyFunction = (...args: any[]) => any;
class ActionLookupProxyHandler<T extends ActionsObject>
  implements ProxyHandler<T>
{
  private _lastValue: T;
  private proxiedFields: Record<string | symbol, ActionsObject[string]>;

  constructor(resolve: () => T | undefined) {
    const initialValue = resolve();
    if (initialValue === undefined) {
      throw new Error("ActionLookup: Initial value is undefined");
    }
    this._lastValue = initialValue;

    const getValue = () => {
      const value = resolve();
      if (value === undefined) return this._lastValue;
      this._lastValue = value;
      return value;
    };

    this.proxiedFields = {};
    for (const key of Object.keys(initialValue)) {
      if (typeof initialValue[key] === "function") {
        this.proxiedFields[key] = (...args) =>
          (getValue()[key] as AnyFunction)(...args);
      } else if (typeof initialValue[key] === "object") {
        this.proxiedFields[key] = new Proxy(
          {},
          new ActionLookupProxyHandler(() => getValue()[key] as ActionsObject),
        );
      }
    }
  }

  get(_: T, prop: string | symbol) {
    return this.proxiedFields[prop];
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this._lastValue);
  }

  has(_: T, prop: string | symbol) {
    return prop in this._lastValue;
  }

  getOwnPropertyDescriptor(_: T, prop: string | symbol) {
    return Object.getOwnPropertyDescriptor(this._lastValue, prop);
  }

  getPrototypeOf() {
    return Object.getPrototypeOf(this._lastValue);
  }
}
export const tapLookupResources = <TState, TActions extends ActionsObject>(
  elements: ResourceElement<{
    key?: string | undefined;
    state: TState;
    actions: TActions;
  }>[],
) => {
  const resources = tapResources(elements);
  const resourcesRef = tapRefValue(resources);

  return {
    state: resources.map((r) => r.state),
    actions: tapCallback((lookup: { index: number } | { key: string }) => {
      if ("index" in lookup) {
        return new Proxy(
          {} as TActions,
          new ActionLookupProxyHandler(
            () => resourcesRef.current[lookup.index]?.actions,
          ),
        );
      } else {
        return resourcesRef.current.find((r) => r.key === lookup.key)!.actions;
      }
    }, []),
  };
};
