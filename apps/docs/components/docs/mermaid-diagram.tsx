import { renderMermaidSVG } from "beautiful-mermaid";

type MermaidDiagramProps = {
  children?: string;
};

export function MermaidDiagram({ children = "" }: MermaidDiagramProps) {
  try {
    const svg = renderMermaidSVG(children, {
      bg: "var(--background)",
      fg: "var(--foreground)",
      muted: "var(--muted-foreground)",
      border: "var(--border)",
      accent: "var(--foreground)",
      transparent: true,
    });

    return (
      <figure
        className="my-8 flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  } catch {
    return (
      <figure className="my-8">
        <pre className="bg-muted/75 overflow-x-auto rounded-lg p-4 text-sm">
          {children.trim()}
        </pre>
        <p className="text-muted-foreground border-border border-t px-4 py-1.5 text-xs">
          diagram could not be rendered
        </p>
      </figure>
    );
  }
}

export default MermaidDiagram;
