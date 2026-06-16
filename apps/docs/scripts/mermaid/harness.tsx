import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { type Editor, type TLDefaultFont, Tldraw, toRichText } from "tldraw";
import { createMermaidDiagram } from "@tldraw/mermaid";
import "tldraw/tldraw.css";

interface RenderOptions {
  padding: number;
}

interface RenderResult {
  light: string;
  dark: string;
}

declare global {
  interface Window {
    __tldrawEditor?: Editor;
    __tldrawReady?: Promise<void>;
    renderMermaid?: (
      source: string,
      opts: RenderOptions,
    ) => Promise<RenderResult>;
  }
}

/**
 * tldraw sizes text shapes by measuring them in the DOM. If the `tldraw_draw`
 * web font isn't loaded when `createMermaidDiagram` runs, labels get measured
 * against a fallback font and end up in boxes that are too small, so the real
 * font then wraps and clips them. Dropping a probe shape per font and waiting
 * for them to load forces the fonts in before we render anything.
 */
async function preloadFonts(editor: Editor): Promise<void> {
  const fonts: TLDefaultFont[] = ["draw", "sans", "serif", "mono"];
  for (const font of fonts) {
    editor.createShape({
      type: "text",
      x: 0,
      y: 0,
      props: { richText: toRichText("Mgjpqy"), font },
    });
  }
  await editor.fonts.loadRequiredFontsForCurrentPage();
  await editor.getContainerDocument().fonts.ready;
  editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
}

function App() {
  return createElement(Tldraw, {
    onMount(editor: Editor) {
      window.__tldrawEditor = editor;
      window.__tldrawReady = preloadFonts(editor);
    },
  });
}

createRoot(document.getElementById("root")!).render(createElement(App));

window.renderMermaid = async (source, opts) => {
  const editor = window.__tldrawEditor;
  if (!editor) throw new Error("tldraw editor is not mounted yet");
  await window.__tldrawReady;

  // Start from a clean page so diagrams never bleed into each other.
  const existing = [...editor.getCurrentPageShapeIds()];
  if (existing.length) editor.deleteShapes(existing);

  await createMermaidDiagram(editor, source, {
    async onUnsupportedDiagram(svgString: string) {
      // Fall back to mermaid's own SVG for diagram types tldraw can't model
      // (pie, gantt, class, ER, ...). Still gives a real diagram, just not the
      // native tldraw aesthetic.
      await editor.putExternalContent({ type: "svg-text", text: svgString });
    },
  });

  const ids = [...editor.getCurrentPageShapeIds()];
  if (!ids.length) throw new Error("mermaid produced no shapes");

  // Export the same layout twice: transparent background each time, but with
  // tldraw's light and dark theme colors, so the page can swap variants.
  const light = await editor.getSvgString(ids, {
    padding: opts.padding,
    background: false,
    darkMode: false,
  });
  const dark = await editor.getSvgString(ids, {
    padding: opts.padding,
    background: false,
    darkMode: true,
  });
  if (!light || !dark) throw new Error("tldraw export produced no svg");

  return { light: light.svg, dark: dark.svg };
};
