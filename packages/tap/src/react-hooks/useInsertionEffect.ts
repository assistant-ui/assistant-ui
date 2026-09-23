import { useEffectImpl } from "./useEffect";

export namespace useInsertionEffect {
  export type Destructor = () => void;
  export type EffectCallback = () => Destructor | undefined;
}

export function useInsertionEffect(
  effect: useInsertionEffect.EffectCallback,
  deps?: readonly unknown[],
): void {
  useEffectImpl(effect, deps, "insertion");
}
