/* oxlint-disable react/rules-of-hooks -- this module deliberately routes hook calls between tap and React at runtime */
/* oxlint-disable react/exhaustive-deps -- dependency arrays are forwarded verbatim from the caller */
// Runtime drop-in for "react": forward everything from react, then override the
// hooks that have a tap equivalent so they route to tap inside a resource render
// and to React otherwise. Alias `react` to this module (build `output.paths` /
// vitest resolver) in code that can run inside a tap resource.
//
// This subpath ships no type declarations: the build reverts the aliased
// specifier back to `"react"` in emitted `.d.ts`, so consumer types resolve to
// React's own. The source-level TS2498 from the `export *` below is suppressed.
import React from "react";
import { peekResourceFiber } from "../core/helpers/execution-context";
import * as hooks from "../react-hooks";
import {
  attachDefaultValueToContext,
  isReadableTapContext,
} from "../core/context";

// @ts-expect-error -- @types/react uses `export =`; this is valid at runtime.
export * from "react";
export { default } from "react";

const inTap = () => peekResourceFiber() !== null;
const ReactRuntime = React as any;

// --- hooks with a tap equivalent: override the star-exported react hooks ---
export const useState = (initialState?: any) =>
  inTap() ? hooks.useState(initialState) : ReactRuntime.useState(initialState);

export const useReducer = (reducer: any, initialArg: any, init?: any) =>
  inTap()
    ? hooks.useReducer(reducer, initialArg, init)
    : ReactRuntime.useReducer(reducer, initialArg, init);

export const useRef = (initialValue?: any) =>
  inTap() ? hooks.useRef(initialValue) : ReactRuntime.useRef(initialValue);

export const useMemo = (factory: any, deps: any) =>
  inTap() ? hooks.useMemo(factory, deps) : ReactRuntime.useMemo(factory, deps);

export const useCallback = (callback: any, deps: any) =>
  inTap()
    ? hooks.useCallback(callback, deps)
    : ReactRuntime.useCallback(callback, deps);

export const useEffect = (effect: any, deps?: any) =>
  inTap()
    ? hooks.useEffect(effect, deps)
    : ReactRuntime.useEffect(effect, deps);

// tap has a single effect primitive; layout effects collapse onto it
export const useLayoutEffect = (effect: any, deps?: any) =>
  inTap()
    ? hooks.useEffect(effect, deps)
    : ReactRuntime.useLayoutEffect(effect, deps);

// The non-tap fallback requires a React version that provides useEffectEvent.
export const useEffectEvent = (callback: any) =>
  inTap()
    ? hooks.useEffectEvent(callback)
    : ReactRuntime.useEffectEvent(callback);

export const useSyncExternalStore = (
  subscribe: any,
  getSnapshot: any,
  getServerSnapshot?: any,
) =>
  inTap()
    ? hooks.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    : ReactRuntime.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
      );

export const useDebugValue = (value: any, format?: any) =>
  inTap()
    ? hooks.useDebugValue(value, format)
    : ReactRuntime.useDebugValue(value, format);

export const createContext = (defaultValue: any) => {
  const context = ReactRuntime.createContext(defaultValue);
  attachDefaultValueToContext(context, defaultValue);
  return context;
};

export const use = (usable: any) =>
  inTap() && isReadableTapContext(usable)
    ? hooks.use(usable)
    : ReactRuntime.use(usable);

export const useContext = (context: any) =>
  inTap() && isReadableTapContext(context)
    ? hooks.use(context)
    : ReactRuntime.useContext(context);
