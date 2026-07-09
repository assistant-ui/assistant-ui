import { Context } from "react";

type ContravariantResource<R, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<R>;

type ExtractResourceReturnType<T> = T extends ResourceElement<infer R, any> ? R : T extends Resource<infer R, any> ? R : never;

type Resource<R, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<R, A>;

type ResourceElement<R, A extends readonly unknown[] = any[]> = {
  readonly hook: (...args: A) => R;
  readonly args: Readonly<A>;
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

declare const createTapRoot: <R>(render: () => R) => useTapRoot.Root<R> & {
  unmount: () => void;
};

declare const flushTapSync: <T>(callback: () => T) => T;

declare namespace entry_root_exports {
  export { ContravariantResource, Resource, ResourceElement, createTapRoot, flushTapSync, resource, useContextProvider, useResource, useResources, useTapHost, useTapRoot, withKey };
}

declare function resource<R, A extends readonly unknown[]>(hook: (...args: A) => R): Resource<R, A>;

declare const useContextProvider: <T, TResult>(context: Context<T>, value: T, fn: () => TResult) => TResult;

declare function useResource<E extends ResourceElement<any, any[]>>(element: E): ExtractResourceReturnType<E>;

declare function useResources<E extends ResourceElement<any, any[]>>(elements: readonly E[]): ExtractResourceReturnType<E>[];

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

declare function withKey<E extends ResourceElement<any, any>>(key: string | number, element: E, deps?: readonly unknown[]): E;

export { entry_root_exports as entry_root };
