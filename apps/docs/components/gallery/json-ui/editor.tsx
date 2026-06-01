"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JsonUI } from "./render";
import { DEFAULT_REGISTRY } from "./primitives";
import type { UINode, UIRegistry } from "./types";

type Parsed =
  | { node: UINode | readonly UINode[]; error: null }
  | { node: null; error: string };

/**
 * A live JSON UI editor: edit the spec on the left, see it render on the right.
 * Renders through the component registry, keeping the last valid spec on the
 * canvas while you type an incomplete one.
 */
export function JsonUiEditor({
  initialSpec,
  registry = DEFAULT_REGISTRY,
}: {
  initialSpec: UINode | readonly UINode[];
  registry?: UIRegistry;
}) {
  const [text, setText] = useState(() => JSON.stringify(initialSpec, null, 2));

  const parsed = useMemo<Parsed>(() => {
    try {
      return { node: JSON.parse(text), error: null };
    } catch (e) {
      return { node: null, error: (e as Error).message };
    }
  }, [text]);

  const lastValid = useRef<UINode | readonly UINode[]>(initialSpec);
  useEffect(() => {
    if (parsed.error === null) lastValid.current = parsed.node;
  }, [parsed]);

  const node = parsed.error === null ? parsed.node : lastValid.current;

  return (
    <div className="border-border/60 grid overflow-hidden rounded-xl border md:grid-cols-2">
      <div className="border-border/60 flex flex-col border-b md:border-r md:border-b-0">
        <div className="text-muted-foreground border-border/60 flex items-center justify-between border-b px-3 py-1.5 text-xs font-medium">
          <span>JSON</span>
          {parsed.error ? (
            <span className="text-destructive">invalid JSON</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400">
              valid
            </span>
          )}
        </div>
        <textarea
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bg-background h-[28rem] w-full resize-none scrollbar-none p-3 font-mono text-[0.8125rem] leading-relaxed outline-none"
        />
        {parsed.error && (
          <div className="text-destructive border-border/60 border-t px-3 py-1.5 font-mono text-xs">
            {parsed.error}
          </div>
        )}
      </div>

      <div className="bg-muted/30 flex min-h-[28rem] items-center justify-center p-6">
        <div className="w-full max-w-[340px]">
          <JsonUI node={node} registry={registry} />
        </div>
      </div>
    </div>
  );
}
