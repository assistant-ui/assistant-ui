"use client";

import { lazy, type ComponentType } from "react";
import { FallbackBoundary } from "./fallback-boundary";

/**
 * Code-splits a client component that server components or MDX render. The
 * export is a plain function component, not the `React.lazy` object: a client
 * reference already resolves through a lazy wrapper on the client, and React
 * rejects a lazy that resolves to another lazy (error #306).
 *
 * There is no Suspense boundary here on purpose. During hydration React keeps
 * the server HTML until the chunk arrives, and during a client navigation the
 * transition keeps the previous page up, so nothing flashes or shifts. An
 * error boundary (which never suspends) contains a chunk that fails to load to
 * the component instead of the whole page.
 */
export function lazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>,
): ComponentType<P> {
  const Lazy = lazy(() => load().then((component) => ({ default: component })));
  const LazyComponent = (props: P) => (
    <FallbackBoundary fallback={null}>
      <Lazy {...props} />
    </FallbackBoundary>
  );
  return LazyComponent;
}
