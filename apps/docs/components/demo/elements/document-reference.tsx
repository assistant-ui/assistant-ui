"use client";

import { useState } from "react";
import {
  DocumentReference,
  type DocumentAnchor,
} from "@/components/assistant-ui/elements/document-reference";

const ANCHORS: readonly DocumentAnchor[] = [
  {
    page: 4,
    quote:
      "The composer owns its draft; parent state that mirrored it is no longer read.",
  },
  {
    page: 9,
    quote:
      "Each thread keeps its own slot, cleared on switch rather than reused.",
  },
];

export function DocumentReferenceDemo() {
  const [activePage, setActivePage] = useState(4);

  return (
    <DocumentReference
      title="migration-0.14.pdf"
      pages={14}
      anchors={ANCHORS}
      activePage={activePage}
      onJump={setActivePage}
    />
  );
}
