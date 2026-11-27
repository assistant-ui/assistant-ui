import react_default, { Context } from "react";

declare const Activity: typeof import("react") extends {
  Activity: infer T;
} ? T : any, Component: typeof import("react") extends {
  Component: infer T;
} ? T : any, Profiler: typeof import("react") extends {
  Profiler: infer T;
} ? T : any, PureComponent: typeof import("react") extends {
  PureComponent: infer T;
} ? T : any, StrictMode: typeof import("react") extends {
  StrictMode: infer T;
} ? T : any, ViewTransition: typeof import("react") extends {
  ViewTransition: infer T;
} ? T : any, act: typeof import("react") extends {
  act: infer T;
} ? T : any, addTransitionType: typeof import("react") extends {
  addTransitionType: infer T;
} ? T : any, cache: typeof import("react") extends {
  cache: infer T;
} ? T : any, cacheSignal: typeof import("react") extends {
  cacheSignal: infer T;
} ? T : any, captureOwnerStack: typeof import("react") extends {
  captureOwnerStack: infer T;
} ? T : any, createFactory: typeof import("react") extends {
  createFactory: infer T;
} ? T : any, createRef: typeof import("react") extends {
  createRef: infer T;
} ? T : any, startTransition: typeof import("react") extends {
  startTransition: infer T;
} ? T : any, unstable_act: typeof import("react") extends {
  unstable_act: infer T;
} ? T : any, unstable_useCacheRefresh: typeof import("react") extends {
  unstable_useCacheRefresh: infer T;
} ? T : any, useActionState: typeof import("react") extends {
  useActionState: infer T;
} ? T : any, useOptimistic: typeof import("react") extends {
  useOptimistic: infer T;
} ? T : any, useTransition: typeof import("react") extends {
  useTransition: infer T;
} ? T : any, version: typeof import("react") extends {
  version: infer T;
} ? T : any, __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: typeof import("react") extends {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: infer T;
} ? T : any, __COMPILER_RUNTIME: typeof import("react") extends {
  __COMPILER_RUNTIME: infer T;
} ? T : any, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: typeof import("react") extends {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: infer T;
} ? T : any;

declare const Children: typeof import("react") extends {
  Children: infer T;
} ? T : any;

type ExtractResourceReturnType<T> = T extends ResourceElement<infer V> ? V : T extends Resource<infer V, any> ? V : never;

declare const Fragment: typeof import("react") extends {
  Fragment: infer T;
} ? T : any;

type Resource<V, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<V>;

type ResourceElement<V> = {
  readonly hook: (...args: any[]) => V;
  readonly args: readonly unknown[];
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

declare const Suspense: typeof import("react") extends {
  Suspense: infer T;
} ? T : any;

declare const c: (size: number) => unknown[];

declare const cloneElement: typeof import("react") extends {
  cloneElement: infer T;
} ? T : (...args: any[]) => any;

declare namespace entry_react_shim_compiler_runtime_exports {
  export { c };
}

declare const createContext: typeof import("react") extends {
  createContext: infer T;
} ? T : (defaultValue: any) => any;

declare const createElement: typeof import("react") extends {
  createElement: infer T;
} ? T : (...args: any[]) => any;

declare const createTapRoot: <R>(render: () => R, options?: {
  mountOnSubscribe?: boolean;
  onError?: (error: unknown) => void;
}) => useTapRoot.Root<R> & {
  unmount: () => void;
};

declare const flushTapSync: <T>(callback: () => T) => T;

declare const forwardRef: typeof import("react") extends {
  forwardRef: infer T;
} ? T : (render: any) => any;

declare namespace entry_react_shim_exports {
  export { Activity, Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense, ViewTransition, __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, __COMPILER_RUNTIME, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, act, addTransitionType, cache, cacheSignal, captureOwnerStack, cloneElement, createContext, createElement, createFactory, createRef, react_default as default, forwardRef, isValidElement, lazy, memo, startTransition, unstable_act, unstable_useCacheRefresh, use, useActionState, useCallback$1 as useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useEffectEvent, useId, useImperativeHandle, useInsertionEffect$1 as useInsertionEffect, useLayoutEffect, useMemo$1 as useMemo, useOptimistic, useReducer, useRef$1 as useRef, useState, useSyncExternalStore, useTransition, version };
}

declare namespace entry_root_exports {
  export { Resource, ResourceElement, createTapRoot, flushTapSync, resource, useContextProvider, useMemoCache, useResource, useResources, useTapHost, useTapRoot, withKey };
}

declare namespace entry_internal_exports {
  export { useRefreshScope };
}

declare const isValidElement: typeof import("react") extends {
  isValidElement: infer T;
} ? T : (value: any) => any;

declare const lazy: typeof import("react") extends {
  lazy: infer T;
} ? T : (load: any) => any;

declare const memo: typeof import("react") extends {
  memo: infer T;
} ? T : (type: any, compare?: any) => any;

declare function resource<R, A extends readonly unknown[]>(hook: (...args: A) => R): Resource<R, A>;

declare const use: typeof import("react") extends {
  use: infer T;
} ? T : (usable: any) => any;

declare const useCallback$1: typeof import("react") extends {
  useCallback: infer T;
} ? T : (callback: any, deps: any) => any;

declare const useContext: typeof import("react") extends {
  useContext: infer T;
} ? T : (context: any) => any;

declare const useContextProvider: <T, TResult>(context: Context<T>, value: T, fn: () => TResult) => TResult;

declare const useDebugValue: typeof import("react") extends {
  useDebugValue: infer T;
} ? T : (value: any, format?: any) => any;

declare const useDeferredValue: typeof import("react") extends {
  useDeferredValue: infer T;
} ? T : (value: any, initialValue?: any) => any;

declare const useEffect: typeof import("react") extends {
  useEffect: infer T;
} ? T : (effect: any, deps?: any) => any;

declare const useEffectEvent: typeof import("react") extends {
  useEffectEvent: infer T;
} ? T : (callback: any) => any;

declare const useId: typeof import("react") extends {
  useId: infer T;
} ? T : () => any;

declare const useImperativeHandle: typeof import("react") extends {
  useImperativeHandle: infer T;
} ? T : (ref: any, create: any, deps?: any) => any;

declare const useInsertionEffect$1: typeof import("react") extends {
  useInsertionEffect: infer T;
} ? T : (effect: any, deps?: any) => any;

declare const useLayoutEffect: typeof import("react") extends {
  useLayoutEffect: infer T;
} ? T : (effect: any, deps?: any) => any;

declare const useMemo$1: typeof import("react") extends {
  useMemo: infer T;
} ? T : (factory: any, deps: any) => any;

declare const useMemoCache: typeof useMemoCache$1;

declare const useMemoCache$1: (size: number) => unknown[];

declare const useReducer: typeof import("react") extends {
  useReducer: infer T;
} ? T : (reducer: any, initialArg: any, init?: any) => any;

declare const useRef$1: typeof import("react") extends {
  useRef: infer T;
} ? T : (initialValue?: any) => any;

declare function useRefreshScope<T>(token: unknown, fn: () => T): T;

declare function useResource<E extends ResourceElement<any>>(element: E): ExtractResourceReturnType<E>;

declare function useResources<E extends ResourceElement<any>>(elements: readonly E[]): ExtractResourceReturnType<E>[];

declare const useState: typeof import("react") extends {
  useState: infer T;
} ? T : (initialState?: any) => any;

declare const useSyncExternalStore: typeof import("react") extends {
  useSyncExternalStore: infer T;
} ? T : (subscribe: any, getSnapshot: any, getServerSnapshot?: any) => any;

declare namespace useTapHost {
  interface Result<R> {
    value: R;
    effects: () => void;
  }
}

declare const useTapHost: <R>(callback: () => R) => useTapHost.Result<R>;

declare namespace useTapRoot {
  type Unsubscribe = () => void;
  interface Root<R> {
    getValue(): R;
    subscribe(listener: () => void): Unsubscribe;
  }
}

declare const useTapRoot: <R>(render: () => R) => useTapRoot.Root<R>;

declare function withKey<E extends ResourceElement<any>>(key: string | number, element: E, deps?: readonly unknown[]): E;

declare function withKey<F extends Resource<any, any[]>>(key: string | number, resource: F): F;

export { entry_internal_exports as entry_internal, entry_react_shim_exports as entry_react_shim, entry_react_shim_compiler_runtime_exports as entry_react_shim_compiler_runtime, entry_root_exports as entry_root };
