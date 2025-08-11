import { useContext, Context } from "react";
import { Store } from "../tap-store";
import { useStoreWithSelector } from "./useStoreWithSelector";

export function createStoreStateHook<TState>(
  context: Context<Store<TState, any> | undefined>
) {
  // empty
  function useStoreState(): TState;

  // selector
  function useStoreState<TSelected>(
    selector: (state: TState) => TSelected
  ): TSelected;

  // selector?
  function useStoreState<TSelected>(
    selector: ((state: TState) => TSelected) | undefined
  ): TSelected | TState;

  // optional=false
  function useStoreState(options: { optional?: false | undefined }): TState;

  // optional?
  function useStoreState(options: {
    optional?: boolean | undefined;
  }): TState | null;

  // optional=false, selector
  function useStoreState<TSelected>(options: {
    optional?: false | undefined;
    selector: (state: TState) => TSelected;
  }): TSelected;

  // optional=false, selector?
  function useStoreState<TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: TState) => TSelected) | undefined;
  }): TSelected | TState;

  // optional?, selector
  function useStoreState<TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: TState) => TSelected;
  }): TSelected | null;

  // optional?, selector?
  function useStoreState<TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: TState) => TSelected) | undefined;
  }): TSelected | TState | null;

  function useStoreState<TSelected>(
    param?:
      | ((state: TState) => TSelected)
      | {
          optional?: boolean | undefined;
          selector?: ((state: TState) => TSelected) | undefined;
        }
  ): TSelected | TState | null {
    let optional = false;
    let selector: ((state: TState) => TSelected) | undefined;

    if (typeof param === "function") {
      selector = param;
    } else if (param) {
      optional = !!param.optional;
      selector = param.selector;
    }

    const store = useContext(context);

    if (!store) {
      if (optional) return null;
      throw new Error(
        "Store context is not available. This hook must be used within the appropriate provider."
      );
    }

    return useStoreWithSelector(store, selector);
  }

  return useStoreState;
}
