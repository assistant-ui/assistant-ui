import { Context } from "react";

type ExtractResourceReturnType<T> = T extends ResourceElement<infer V> ? V : T extends Resource<infer V, any> ? V : never;

type Resource<V, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<V>;

type ResourceElement<V> = {
  readonly hook: (...args: any[]) => V;
  readonly args: readonly unknown[];
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

declare const createTapRoot: <R>(render: () => R) => useTapRoot.Root<R> & {
  unmount: () => void;
};

declare const flushTapSync: <T>(callback: () => T) => T;

declare namespace entry_root_exports {
  export { Resource, ResourceElement, createTapRoot, flushTapSync, resource, useContextProvider, useMemoCache, useResource, useResources, useTapHost, useTapRoot, withKey };
}

declare function resource<R, A extends readonly unknown[]>(hook: (...args: A) => R): Resource<R, A>;

declare const useContextProvider: <T, TResult>(context: Context<T>, value: T, fn: () => TResult) => TResult;

declare const useMemoCache: (size: number) => unknown[];

declare function useResource<E extends ResourceElement<any>>(element: E): ExtractResourceReturnType<E>;

declare function useResources<E extends ResourceElement<any>>(elements: readonly E[]): ExtractResourceReturnType<E>[];

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

export { entry_root_exports as entry_root };
