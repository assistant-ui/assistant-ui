import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const THEME_SCRIPT =
  '(function(){var theme=new URLSearchParams(location.search).get("theme");if(theme==="light"||theme==="dark"){document.documentElement.classList.add(theme);document.documentElement.style.colorScheme=theme;}})();';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
