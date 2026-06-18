import { renderMermaidSVG } from "beautiful-mermaid";

type MermaidDiagramProps = {
  children?: string;
};

export function MermaidDiagram({ children = "" }: MermaidDiagramProps) {
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
}

export default MermaidDiagram;
