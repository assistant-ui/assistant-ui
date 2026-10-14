import { useEffect, useInsertionEffect, useRef, useState } from "react";
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
  muted = false,
}: {
  title: string;
  toolCallId: string;
  initial: SharedContext | undefined;
  useModelContext: (source: ModelContextSource) => void;
  onShare: (context: SharedContext | undefined) => void;
  muted?: boolean;
}): (context: SharedContext | undefined) => void {
  const name = useRef(title || toolCallId);
  const handler = useRef(onShare);
  const silent = useRef(muted);
  useInsertionEffect(() => {
    name.current = title || toolCallId;
    handler.current = onShare;
    silent.current = muted;
  });
  const [shared] = useState(() =>
    createSharedContext(initial, {
      name: () => name.current,
      muted: () => silent.current,
      onShare: (context) => handler.current(context),
    }),
  );
  useModelContext(shared.source);
  const notified = useRef(muted);
  useEffect(() => {
    if (notified.current === muted) return;
    notified.current = muted;
    shared.notify();
  }, [muted, shared]);
  return shared.share;
}
