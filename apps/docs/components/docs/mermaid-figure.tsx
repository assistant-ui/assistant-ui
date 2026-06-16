type MermaidFigureProps = {
  light: string;
  dark: string;
  width?: string;
};

export function MermaidFigure({ light, dark, width }: MermaidFigureProps) {
  return (
    <figure
      className="mermaid-diagram"
      style={width ? { maxWidth: width } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="mermaid-light"
        src={light}
        alt="Diagram"
        loading="lazy"
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="mermaid-dark"
        src={dark}
        alt="Diagram"
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

export default MermaidFigure;
