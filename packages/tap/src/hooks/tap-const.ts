import { tapState } from "./tap-state";

export function tapConst<T>(getValue: () => T, _deps: readonly never[]): T {
  const [state] = tapState(getValue);
  return state;
}
