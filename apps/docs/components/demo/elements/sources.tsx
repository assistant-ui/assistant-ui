"use client";

import { useState } from "react";
import {
  Sources,
  type Source,
} from "@/components/assistant-ui/elements/sources";

const SOURCES: Source[] = [
  {
    domain: "assistant-ui.com",
    title: "Runtime drafts API",
  },
  {
    domain: "react.dev",
    title: "You might not need an effect",
  },
  {
    domain: "patterns.dev",
    title: "Optimistic UI updates",
  },
  {
    domain: "github.com",
    title: "assistant-ui #5321 draft restore",
  },
];

export function SourcesDemo() {
  const [open, setOpen] = useState(false);

  return <Sources sources={SOURCES} open={open} onOpenChange={setOpen} />;
}
