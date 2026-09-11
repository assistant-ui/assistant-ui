// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { collectPageEntries, collectPageTextMatches } from "./collect-page";

function renderPage(html: string) {
  document.body.innerHTML = `<article data-page-content="">${html}</article>`;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("collectPageEntries", () => {
  it("carries the heading node so a heading without an id is still reachable", () => {
    renderPage(`
      <h2 id="formats">Formats</h2>
      <h2>Anonymous section</h2>
    `);

    const entries = collectPageEntries("/docs/tools/interactables");

    expect(entries.map((entry) => entry.url)).toEqual([
      "/docs/tools/interactables#formats",
      "/docs/tools/interactables",
    ]);
    expect(entries.map((entry) => entry.element?.tagName)).toEqual([
      "H2",
      "H2",
    ]);
  });
});

describe("collectPageTextMatches", () => {
  it("carries the matched block, not just its section anchor", () => {
    renderPage(`
      <h2 id="formats">Formats</h2>
      <p>A formatter receives one snapshot entry.</p>
      <p>Something else entirely here.</p>
    `);

    const [match, ...rest] = collectPageTextMatches(
      "/docs/tools/interactables",
      "formatter receives",
    );

    expect(rest).toHaveLength(0);
    expect(match?.url).toBe("/docs/tools/interactables#formats");
    expect(match?.element?.textContent).toContain("A formatter receives");
  });

  it("carries a block that sits above every anchored heading", () => {
    renderPage(`
      <p>Interactables let agents and users edit the same tool UI.</p>
      <h2 id="formats">Formats</h2>
    `);

    const [match] = collectPageTextMatches(
      "/docs/tools/interactables",
      "interactables let agents",
    );

    expect(match?.url).toBe("/docs/tools/interactables");
    expect(match?.element?.tagName).toBe("P");
  });
});
