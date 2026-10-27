// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { SearchProvider } from "fumadocs-ui/contexts/search";
import { describe, expect, it } from "vitest";
import { DocsHeader } from "./header";

describe("documentation header", () => {
  it.each(["Ctrl", "⌘"])(
    "displays the configured %s search shortcut",
    (modifier) => {
      const html = renderToStaticMarkup(
        <SearchProvider
          preload={false}
          hotKey={[
            { key: "Control", display: modifier },
            { key: "k", display: "K" },
          ]}
        >
          <DocsHeader
            brand="Project"
            brandSlot={null}
            homeUrl="/"
            docsUrl="/docs"
            name="Project"
            links={[]}
            themeToggle={false}
          />
        </SearchProvider>,
      );
      const container = document.createElement("div");
      container.innerHTML = html;
      expect(container.querySelector("kbd")?.textContent).toBe(`${modifier} K`);
      expect(
        container
          .querySelector('a[href="/docs"]')
          ?.getAttribute("aria-current"),
      ).toBe("true");
    },
  );
});
