type MermaidFigureProps = {
  light: string;
  dark: string;
  width?: string;
  alt?: string;
};

export function MermaidFigure({
  light,
  dark,
  width,
  alt = "Diagram",
}: MermaidFigureProps) {
  return (
    <figure
      className="mermaid-diagram"
      style={width ? { maxWidth: width } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="mermaid-light"
        src={light}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="mermaid-dark"
        src={dark}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

export default MermaidFigure;
