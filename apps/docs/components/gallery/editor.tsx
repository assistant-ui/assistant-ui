"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { renderGenerativeUI } from "@assistant-ui/react-generative-ui";
import type {
  GenerativeUILibrary,
  GenerativeUIRenderContext,
} from "@assistant-ui/react-generative-ui";

type Parsed = { node: unknown; error: null } | { node: null; error: string };

export function GenerativeUIEditor({
  initialSpec,
  library,
}: {
  initialSpec: unknown;
  library: GenerativeUILibrary;
}) {
  const [text, setText] = useState(() => JSON.stringify(initialSpec, null, 2));
  const parsed = useMemo<Parsed>(() => {
    try {
      return { node: JSON.parse(text), error: null };
    } catch (e) {
      return { node: null, error: (e as Error).message };
    }
  }, [text]);
  const lastValid = useRef<unknown>(initialSpec);
  useEffect(() => {
    if (parsed.error === null) lastValid.current = parsed.node;
  }, [parsed]);
  const node = parsed.error === null ? parsed.node : lastValid.current;
  const context: GenerativeUIRenderContext = { status: "done" };
  return (
    <div className="grid h-[500px] grid-cols-1 gap-4 md:grid-cols-2">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bg-muted/30 h-full w-full resize-none rounded-lg border p-4 font-mono text-xs leading-relaxed focus:outline-none"
          spellCheck={false}
        />
        {parsed.error ? (
          <div className="bg-destructive/10 text-destructive absolute right-2 bottom-2 left-2 rounded px-3 py-1.5 text-xs">
            {parsed.error}
          </div>
        ) : null}
      </div>
      <div className="bg-muted/20 overflow-auto rounded-lg border p-6">
        <Preview node={node} library={library} context={context} />
      </div>
    </div>
  );
}

function Preview({
  node,
  library,
  context,
}: {
  node: unknown;
  library: GenerativeUILibrary;
  context: GenerativeUIRenderContext;
}): ReactNode {
  try {
    return renderGenerativeUI(node, library, context);
  } catch {
    return null;
  }
}
