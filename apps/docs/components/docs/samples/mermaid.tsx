import { renderMermaidSVG } from "beautiful-mermaid";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const MERMAID_CODE = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`;

export function MermaidSample() {
  const svg = renderMermaidSVG(MERMAID_CODE, {
    bg: "var(--background)",
    fg: "var(--foreground)",
    muted: "var(--muted-foreground)",
    border: "var(--border)",
    accent: "var(--foreground)",
    transparent: true,
  });
  return (
    <SampleFrame className="bg-muted/40 h-100 overflow-hidden">
      <div
        className="flex h-full items-center justify-center [&_svg]:mx-auto [&_svg]:max-h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </SampleFrame>
  );
}
