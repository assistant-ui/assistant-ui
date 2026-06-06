/* oxlint-disable react-hooks/rules-of-hooks -- this module deliberately routes hook calls between tap and React at runtime */
/* oxlint-disable tap-hooks/exhaustive-deps -- dependency arrays are forwarded verbatim from the caller */
// Runtime drop-in for "react": forward everything from react, then override the
// hooks that have a tap equivalent so they route to tap inside a resource render
// and to React otherwise. Alias `react` to this module (build `output.paths` /
// vitest resolver) in code that can run inside a tap resource.
//
// This subpath ships no type declarations: the build reverts the aliased
// specifier back to `"react"` in emitted `.d.ts`, so consumer types resolve to
// React's own. The source-level TS2498 from the `export *` below is suppressed.
import * as React from "react";
import { peekResourceFiber } from "../core/helpers/execution-context";
import * as hooks from "../hooks";
import { useResourceContext, isResourceContext } from "../core/context";

// @ts-expect-error -- @types/react uses `export =`; this is valid at runtime.
export * from "react";
export { default } from "react";

const inTap = () => peekResourceFiber() !== null;

// --- hooks with a tap equivalent: override the star-exported react hooks ---

export const useState = (initialState?: any) =>
  inTap() ? hooks.useState(initialState) : React.useState(initialState);

export const useReducer = (reducer: any, initialArg: any, init?: any) =>
  inTap()
    ? hooks.useReducer(reducer, initialArg, init)
    : React.useReducer(reducer, initialArg, init);

export const useRef = (initialValue?: any) =>
  inTap() ? hooks.useRef(initialValue) : React.useRef(initialValue);

export const useMemo = (factory: any, deps: any) =>
  inTap() ? hooks.useMemo(factory, deps) : React.useMemo(factory, deps);

export const useCallback = (callback: any, deps: any) =>
  inTap()
    ? hooks.useCallback(callback, deps)
    : React.useCallback(callback, deps);

export const useEffect = (effect: any, deps?: any) =>
  inTap() ? hooks.useEffect(effect, deps) : React.useEffect(effect, deps);

// tap has a single effect primitive; layout effects collapse onto it
export const useLayoutEffect = (effect: any, deps?: any) =>
  inTap() ? hooks.useEffect(effect, deps) : React.useLayoutEffect(effect, deps);

export const useEffectEvent = (callback: any) =>
  inTap() ? hooks.useEffectEvent(callback) : React.useEffectEvent(callback);

// `use(usable)` reads tap resource context when handed a tap context (routed by
// its brand, not by ambient render state), and falls back to React's `use`
// (promises / React context) for everything else.
export const use = (usable: any) =>
  isResourceContext(usable) ? useResourceContext(usable) : React.use(usable);

// `useContext(context)` reads tap resource context when handed a tap context
// (routed by its brand), and falls back to React's `useContext` otherwise.
export const useContext = (context: any) =>
  isResourceContext(context)
    ? useResourceContext(context)
    : React.useContext(context);
