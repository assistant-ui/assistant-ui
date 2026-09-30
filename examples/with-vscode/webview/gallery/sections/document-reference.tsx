import { useState } from "react";
import {
  DocumentReference,
  type DocumentAnchor,
} from "@assistant-ui/ui/components/assistant-ui/elements/document-reference.tsx";
import { defineSections } from "../types";

const ANCHORS: readonly DocumentAnchor[] = [
  {
    page: 4,
    quote:
      "Scripts run only when they carry the nonce the host generated for this page.",
  },
  {
    page: 9,
    quote:
      "Resources outside the extension load through asWebviewUri and the cspSource.",
  },
];

function Reference() {
  const [activePage, setActivePage] = useState(4);
  return (
    <DocumentReference
      title="webview-security.pdf"
      pages={14}
      anchors={ANCHORS}
      activePage={activePage}
      onJump={setActivePage}
    />
  );
}

export default defineSections([
  {
    id: "document-reference",
    title: "Document reference",
    category: "content",
    notes: "A PDF with two anchored quotes; jumping moves the active page.",
    render: () => <Reference />,
  },
]);
