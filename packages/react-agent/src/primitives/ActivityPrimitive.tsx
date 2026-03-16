"use client";

import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useActiveItems } from "../hooks/useActiveItems";
import type { ActiveItem } from "../runtime/types";

function ActivityRoot({ children }: { children: ReactNode }) {
  const items = useActiveItems();
  if (items.length === 0) return null;
  return <>{children}</>;
}

ActivityRoot.displayName = "ActivityPrimitive.Root";

function ActivityItems({
  children,
}: {
  children: (item: ActiveItem) => ReactNode;
}) {
  const items = useActiveItems();
  return <>{items.map((item) => children(item))}</>;
}

ActivityItems.displayName = "ActivityPrimitive.Items";

function ActivityCount(props: ComponentPropsWithoutRef<"span">) {
  const items = useActiveItems();
  return <span {...props}>{items.length}</span>;
}

ActivityCount.displayName = "ActivityPrimitive.Count";

export const ActivityPrimitive = {
  Root: ActivityRoot,
  Items: ActivityItems,
  Count: ActivityCount,
};
