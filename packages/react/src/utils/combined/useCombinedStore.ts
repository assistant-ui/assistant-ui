import { useMemo } from "react";
import {
  type CombinedSelector,
  createCombinedStore,
} from "./createCombinedStore";
import { ReadonlyStore } from "../../context/ReadonlyStore";

export const useCombinedStore = <T extends Array<unknown>, R>(
  stores: { [K in keyof T]: ReadonlyStore<T[K]> },
  selector: CombinedSelector<T, R>,
): R => {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- shallow-compare the store array
  const useCombined = useMemo(() => createCombinedStore<T, R>(stores), stores);
  return useCombined(selector);
};
