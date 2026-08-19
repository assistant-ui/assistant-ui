/* oxlint-disable react/rules-of-hooks -- this module deliberately routes hook calls to tap at runtime */
/* oxlint-disable react/exhaustive-deps -- dependency arrays are forwarded verbatim from the caller */
// React-free runtime drop-in for "react": route supported hooks to tap inside a resource render and throw outside one. Alias `react` to this module in code hosted inside `createTapRoot`.
import { peekResourceFiber } from "../core/helpers/execution-context";
import {
  attachDefaultValueToContext,
  useContext as useTapContext,
} from "../core/context";
import { useState as useTapState } from "../react-hooks/useState";
import { useReducer as useTapReducer } from "../react-hooks/useReducer";
import { useRef as useTapRef } from "../react-hooks/useRef";
import { useMemo as useTapMemo } from "../react-hooks/useMemo";
import { useCallback as useTapCallback } from "../react-hooks/useCallback";
import { useEffect as useTapEffect } from "../react-hooks/useEffect";
import { useEffectEvent as useTapEffectEvent } from "../react-hooks/useEffectEvent";
import { useSyncExternalStore as useTapSyncExternalStore } from "../react-hooks/useSyncExternalStore";
import { useDebugValue as useTapDebugValue } from "../react-hooks/useDebugValue";
import { use as useTap } from "../react-hooks/use";
import { useId as useTapId } from "../react-hooks/useId";
import { useImperativeHandle as useTapImperativeHandle } from "../react-hooks/useImperativeHandle";

const inTap = () => peekResourceFiber() !== null;

const throwOutsideTap = (name: string): never => {
  throw new Error(
    `${name} from @assistant-ui/tap/standalone-shim was called outside a tap resource render. The standalone shim has no React fallback; host this code inside createTapRoot.`,
  );
};

export const useState = (initialState?: any) =>
  inTap() ? useTapState(initialState) : throwOutsideTap("useState");

export const useReducer = (reducer: any, initialArg: any, init?: any) =>
  inTap()
    ? useTapReducer(reducer, initialArg, init)
    : throwOutsideTap("useReducer");

export const useRef = (initialValue?: any) =>
  inTap() ? useTapRef(initialValue) : throwOutsideTap("useRef");

export const useMemo = (factory: any, deps: any) =>
  inTap() ? useTapMemo(factory, deps) : throwOutsideTap("useMemo");

export const useCallback = (callback: any, deps: any) =>
  inTap() ? useTapCallback(callback, deps) : throwOutsideTap("useCallback");

export const useEffect = (effect: any, deps?: any) =>
  inTap() ? useTapEffect(effect, deps) : throwOutsideTap("useEffect");

export const useLayoutEffect = (effect: any, deps?: any) =>
  inTap() ? useTapEffect(effect, deps) : throwOutsideTap("useLayoutEffect");

export const useInsertionEffect = (effect: any, deps?: any) =>
  inTap() ? useTapEffect(effect, deps) : throwOutsideTap("useInsertionEffect");

export const useEffectEvent = (callback: any) =>
  inTap() ? useTapEffectEvent(callback) : throwOutsideTap("useEffectEvent");

export const useSyncExternalStore = (
  subscribe: any,
  getSnapshot: any,
  getServerSnapshot?: any,
) =>
  inTap()
    ? useTapSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    : throwOutsideTap("useSyncExternalStore");

export const useDebugValue = (value: any, format?: any) =>
  inTap() ? useTapDebugValue(value, format) : throwOutsideTap("useDebugValue");

export const useId = () => (inTap() ? useTapId() : throwOutsideTap("useId"));

export const useImperativeHandle = (ref: any, create: any, deps?: any) =>
  inTap()
    ? useTapImperativeHandle(ref, create, deps)
    : throwOutsideTap("useImperativeHandle");

export const createContext = (defaultValue: any) => {
  const context = {};
  attachDefaultValueToContext(context as any, defaultValue);
  return context as any;
};

export const use = (usable: any) =>
  inTap() ? useTap(usable) : throwOutsideTap("use");

export const useContext = (context: any) =>
  inTap() ? useTapContext(context) : throwOutsideTap("useContext");

// Component factories evaluated at module scope in react-coupled barrels.
// They return React's marker shapes so the modules load; rendering the
// results without real React fails in the jsx-runtime shim instead.
export const forwardRef = (render: any) => ({
  $$typeof: Symbol.for("react.forward_ref"),
  render,
});

export const memo = (type: any, compare?: any) => ({
  $$typeof: Symbol.for("react.memo"),
  type,
  compare: compare ?? null,
});

export const Fragment = Symbol.for("react.fragment");

const throwNoReact = (name: string): never => {
  throw new Error(
    `${name} from @assistant-ui/tap/standalone-shim was called without React. The standalone shim only makes react-coupled modules loadable; rendering them requires real React.`,
  );
};

export const createElement = (): never => throwNoReact("createElement");

export const cloneElement = (): never => throwNoReact("cloneElement");

export const isValidElement = (_value: unknown) => false;

export const lazy = (load: any) => ({
  $$typeof: Symbol.for("react.lazy"),
  _payload: { _status: -1, _result: load },
  _init: () => throwNoReact("lazy"),
});

export const Children = {
  map: () => throwNoReact("Children.map"),
  forEach: () => throwNoReact("Children.forEach"),
  count: () => throwNoReact("Children.count"),
  toArray: () => throwNoReact("Children.toArray"),
  only: () => throwNoReact("Children.only"),
};

export const Suspense = Symbol.for("react.suspense");

export const useDeferredValue = (): never => throwNoReact("useDeferredValue");

const StandaloneRuntime = Object.freeze({
  useState,
  useReducer,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useEffectEvent,
  useSyncExternalStore,
  useDebugValue,
  useId,
  useImperativeHandle,
  createContext,
  use,
  useContext,
  forwardRef,
  memo,
  Fragment,
  createElement,
  cloneElement,
  isValidElement,
  lazy,
  Children,
  Suspense,
  useDeferredValue,
});

export default StandaloneRuntime;
