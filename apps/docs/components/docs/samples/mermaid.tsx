"use client";

import { useEffect, useRef } from "react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const MERMAID_CODE = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`;

function MermaidDiagramStatic() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      const mermaid = await import("mermaid");
      if (cancelled || !ref.current) return;

      mermaid.default.initialize({ theme: "default", startOnLoad: false });
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      const result = await mermaid.default.render(id, MERMAID_CODE);

      if (!cancelled && ref.current) {
        ref.current.innerHTML = result.svg;
      }
    }

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <pre
      ref={ref}
      className="flex h-full items-center justify-center [&_svg]:mx-auto"
    >
      Loading diagram...
    </pre>
  );
}

export function MermaidSample() {
  return (
    <SampleFrame className="h-100 overflow-hidden bg-muted/40">
      <MermaidDiagramStatic />
    </SampleFrame>
  );
}
