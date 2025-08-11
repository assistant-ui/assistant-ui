type BaseHook<TBase> = {
  (): TBase;
  <TSelected>(selector: (state: TBase) => TSelected): TSelected;
  <TSelected>(
    selector: ((state: TBase) => TSelected) | undefined
  ): TSelected | TBase;
  (options: { optional?: false | undefined }): TBase;
  (options: { optional?: boolean | undefined }): TBase | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: TBase) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: TBase) => TSelected) | undefined;
  }): TSelected | TBase;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: TBase) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: TBase) => TSelected) | undefined;
  }): TSelected | TBase | null;
};

export function createDerivedStateHook<TBase, TDerived>(
  baseHook: BaseHook<TBase>,
  deriveFn: (base: TBase) => TDerived
) {
  // empty
  function useDerivedState(): TDerived;

  // selector
  function useDerivedState<TSelected>(
    selector: (state: TDerived) => TSelected
  ): TSelected;

  // selector?
  function useDerivedState<TSelected>(
    selector: ((state: TDerived) => TSelected) | undefined
  ): TSelected | TDerived;

  // optional=false
  function useDerivedState(options: { optional?: false | undefined }): TDerived;

  // optional?
  function useDerivedState(options: {
    optional?: boolean | undefined;
  }): TDerived | null;

  // optional=false, selector
  function useDerivedState<TSelected>(options: {
    optional?: false | undefined;
    selector: (state: TDerived) => TSelected;
  }): TSelected;

  // optional=false, selector?
  function useDerivedState<TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: TDerived) => TSelected) | undefined;
  }): TSelected | TDerived;

  // optional?, selector
  function useDerivedState<TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: TDerived) => TSelected;
  }): TSelected | null;

  // optional?, selector?
  function useDerivedState<TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: TDerived) => TSelected) | undefined;
  }): TSelected | TDerived | null;

  function useDerivedState<TSelected>(
    param?:
      | ((state: TDerived) => TSelected)
      | {
          optional?: boolean | undefined;
          selector?: ((state: TDerived) => TSelected) | undefined;
        }
  ): TSelected | TDerived | null {
    if (typeof param === "function") {
      return baseHook((state) => param(deriveFn(state)));
    } else if (param && typeof param === "object") {
      const { optional, selector } = param;
      
      if (selector) {
        return baseHook({
          optional,
          selector: (state: TBase) => selector(deriveFn(state))
        } as any);
      } else {
        return baseHook({
          optional,
          selector: deriveFn
        } as any);
      }
    } else {
      return baseHook(deriveFn);
    }
  }

  return useDerivedState;
}