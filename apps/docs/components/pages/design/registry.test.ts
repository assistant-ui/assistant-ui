import fs from "node:fs";
import path from "node:path";
import { DESIGN_COMPONENTS } from "./registry-meta";
import { DESIGN_PREVIEWS } from "./registry";

describe("design registry", () => {
  it("keeps meta and previews in sync per slug", () => {
    const metaSlugs = DESIGN_COMPONENTS.map((component) => component.slug);
    expect(new Set(metaSlugs).size).toBe(metaSlugs.length);
    expect(Object.keys(DESIGN_PREVIEWS).sort()).toEqual([...metaSlugs].sort());
  });

  it("has an MDX page for every component", () => {
    const designDir = path.join(
      __dirname,
      "../../../content/design/components",
    );
    const designSlugs = new Set(
      fs
        .readdirSync(designDir)
        .filter((file) => file.endsWith(".mdx"))
        .map((file) => file.replace(/\.mdx$/, "")),
    );

    for (const component of DESIGN_COMPONENTS) {
      expect(
        designSlugs.has(component.slug),
        `missing MDX for ${component.slug}`,
      ).toBe(true);
    }
  });
});
