"use client";

import { DeferredHighlight } from "@/components/shared/deferred-highlight";

/**
 * The docs highlighter in the GitHub themes, which the token sheet's code
 * theme recolors by their github-light colors.
 */
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
      theme={{ light: "github-light", dark: "github-dark" }}
      defaultColor="light-dark()"
      addDefaultStyles={false}
      showLanguage={false}
    >
      {code}
    </DeferredHighlight>
  );
}
