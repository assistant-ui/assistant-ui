"use client";

import {
  Source,
  SourceIcon,
  SourceTitle,
} from "@/components/assistant-ui/elements/sources.aui";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function SourcesLongTitle() {
  return (
    <Source href="https://vercel.com/blog">
      <SourceIcon url="https://vercel.com/blog" />
      <SourceTitle className="max-w-32">
        A complete guide to streaming assistant responses with tool calls and
        citations
      </SourceTitle>
    </Source>
  );
}

export function SourcesLongTitleSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <SourcesLongTitle />
    </SampleFrame>
  );
}
