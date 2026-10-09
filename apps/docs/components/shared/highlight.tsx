"use client";

import ShikiHighlighter from "react-shiki";

export function Highlight({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  return (
    <ShikiHighlighter
      language={language}
      theme={{ light: "catppuccin-latte", dark: "catppuccin-mocha" }}
      addDefaultStyles={false}
      showLanguage={false}
    >
      {code}
    </ShikiHighlighter>
  );
}
