type MermaidFigureProps = {
  /** Public URL of the light-theme SVG (e.g. `/diagrams/<hash>.svg`). */
  light: string;
  /** Public URL of the dark-theme SVG (e.g. `/diagrams/<hash>.dark.svg`). */
  dark: string;
  /** Optional CSS max-width cap, set from the fence meta `width=`. */
  width?: string;
};

/**
 * Renders a build-time tldraw-rendered mermaid diagram. Both theme variants are
 * emitted; `.mermaid-diagram` CSS in `globals.css` shows the one matching the
 * active theme. Injected by the `remarkMermaidTldraw` plugin in place of
 * ```mermaid code fences.
 */
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
