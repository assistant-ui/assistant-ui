"use client";

import { DeferredHighlight } from "./deferred-highlight";

export function Highlight({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  return (
    <DeferredHighlight
      language={language}
      theme={{ light: "catppuccin-latte", dark: "catppuccin-mocha" }}
      addDefaultStyles={false}
      showLanguage={false}
    >
      {code}
    </DeferredHighlight>
  );
}
