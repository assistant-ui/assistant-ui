import { useInsertionEffect, useRef, useState } from "react";
import {
  createSharedContext,
  type ModelContextSource,
  type SharedContext,
} from "./modelContext";

/** {@link createSharedContext} for one mounted call, registered through `useModelContext`. */
export function useSharedContext({
  title,
  toolCallId,
  initial,
  useModelContext,
  onShare,
}: {
  title: string;
  toolCallId: string;
  initial: SharedContext | undefined;
  useModelContext: (source: ModelContextSource) => void;
  onShare: (context: SharedContext | undefined) => void;
}): (context: SharedContext | undefined) => void {
  const name = useRef(title || toolCallId);
  const handler = useRef(onShare);
  useInsertionEffect(() => {
    name.current = title || toolCallId;
    handler.current = onShare;
  });
  const [shared] = useState(() =>
    createSharedContext(initial, {
      name: () => name.current,
      onShare: (context) => handler.current(context),
    }),
  );
  useModelContext(shared.source);
  return shared.share;
}
