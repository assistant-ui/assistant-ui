"use client";

import type { FC, ReactNode } from "react";

export type ThreadViewportSlackProps = {
  /** @deprecated no longer read; configuration lives on `MessagePrimitive.Root`. */
  fillClampThreshold?: string | undefined;
  /** @deprecated no longer read; configuration lives on `MessagePrimitive.Root`. */
  fillClampOffset?: string | undefined;
  children: ReactNode;
};

/**
 * @deprecated Top-anchor target registration is now automatic when using
 * `MessagePrimitive.Root`. This component is a no-op pass-through retained for
 * backwards compatibility and will be removed in a future minor. Remove it
 * from your tree and pass `fillClampThreshold` / `fillClampOffset` to
 * `MessagePrimitive.Root` instead, if needed.
 */
export const ThreadPrimitiveViewportSlack: FC<ThreadViewportSlackProps> = ({
  children,
}) => <>{children}</>;

ThreadPrimitiveViewportSlack.displayName = "ThreadPrimitive.ViewportSlack";
