import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/components/pages/elements/registry";
import { LIBRARY_CATEGORY_IDS } from "./catalog";
import { getLibraryItems } from "./items";
import { LIBRARY_THEMES } from "./themes";

describe("library items", () => {
  const items = getLibraryItems();

  it("gives every item its own id", () => {
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists something in every category", () => {
    for (const category of LIBRARY_CATEGORY_IDS) {
      expect(items.some((item) => item.category === category)).toBe(true);
    }
  });

  it("lists every element in the docs registry once, split into Elements and AUI connected", () => {
    const elements = items.filter(
      (item) => item.section === "Elements" || item.section === "AUI connected",
    );

    expect(elements.map((item) => item.id).sort()).toEqual(
      ELEMENTS.map((element) => `components/${element.slug}`).sort(),
    );
    expect(
      elements.filter((item) => item.section === "AUI connected").length,
    ).toBe(
      ELEMENTS.filter((element) => element.section === "AUI connected").length,
    );
  });

  it("reads runtime titles from the docs pages on disk", () => {
    const runtimes = items.filter((item) => item.category === "runtimes");
    expect(runtimes.length).toBeGreaterThan(0);
    for (const runtime of runtimes) {
      expect(runtime.name.trim()).not.toBe("");
      expect(runtime.description.trim()).not.toBe("");
    }
  });

  it("lists every theme with the command that applies it", () => {
    const themes = items.filter((item) => item.category === "themes");
    expect(themes).toHaveLength(LIBRARY_THEMES.length);
    for (const theme of themes) {
      expect(theme.install).toMatchObject({ kind: "command" });
      expect(
        theme.install?.kind === "command" && theme.install.command,
      ).toMatch(/^npx shadcn@latest apply /);
    }
  });

  it("serves block screenshots from the docs site's own files", () => {
    const blocks = items.filter((item) => item.category === "blocks");
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.preview).toMatchObject({ kind: "image" });
      if (block.preview?.kind === "image") {
        expect(block.preview.light).toMatch(/^\/screenshot\//);
        expect(block.preview.dark).toMatch(/^\/screenshot\//);
      }
    }
  });
});
