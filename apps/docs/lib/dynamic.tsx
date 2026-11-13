"use client";

import {
  lazy,
  Suspense,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";

type Loader<P> = () => Promise<
  ComponentType<P> | { default: ComponentType<P> }
>;

const subscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/** Code-splits a component the way `next/dynamic` did: a fallback while it loads, and with `ssr: false` none of it on the server. */
export default function dynamic<P extends object>(
  load: Loader<P>,
  options: { ssr?: boolean; loading?: () => ReactNode } = {},
) {
  const Lazy = lazy(async () => {
    const loaded = await load();
    return "default" in loaded ? loaded : { default: loaded };
  });
  const fallback = options.loading?.() ?? null;
  const ssr = options.ssr ?? true;
  return function Dynamic(props: P) {
    const mounted = useMounted();
    if (!ssr && !mounted) return fallback;
    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
