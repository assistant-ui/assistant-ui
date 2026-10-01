import { useState } from "react";
import {
  Citation,
  InlineCitation,
  type Source,
} from "@assistant-ui/ui/components/assistant-ui/elements/inline-citation.tsx";
import { defineSections } from "../types";
import { useShownAlone } from "./_open-when-alone";

const SOURCES = [
  {
    domain: "code.visualstudio.com",
    title: "Webview API",
    snippet:
      "Webviews run in an isolated context and talk to the extension through message passing.",
    url: "https://code.visualstudio.com/api/extension-guides/webview",
    publishedAt: "2026-08-01",
  },
  {
    domain: "developer.mozilla.org",
    title: "Content Security Policy",
    snippet:
      "A nonce allows one inline script or style that carries the matching attribute.",
  },
] as const satisfies readonly Source[];

function Paragraph({ initialOpen = null }: { initialOpen?: number | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(initialOpen);
  return (
    <InlineCitation>
      The webview talks to the extension host over postMessage
      <Citation
        index={0}
        source={SOURCES[0]}
        open={openIndex === 0}
        onOpenChange={(open) => setOpenIndex(open ? 0 : null)}
      />
      , and every inline script or style needs the page nonce
      <Citation
        index={1}
        source={SOURCES[1]}
        open={openIndex === 1}
        onOpenChange={(open) => setOpenIndex(open ? 1 : null)}
      />
      .
    </InlineCitation>
  );
}

function OpenWhenAlone() {
  const alone = useShownAlone("inline-citation-open");
  return (
    <div className="min-h-48">
      <Paragraph key={String(alone)} initialOpen={alone ? 0 : null} />
    </div>
  );
}

export default defineSections([
  {
    id: "inline-citation",
    title: "Inline citation",
    category: "content",
    notes:
      "Numbered citation chips inside running text; hover or focus opens the card.",
    render: () => <Paragraph />,
  },
  {
    id: "inline-citation-open",
    title: "Inline citation (card open)",
    category: "content",
    notes:
      "The first citation's preview card, open when this section is shown alone.",
    render: () => <OpenWhenAlone />,
  },
]);
