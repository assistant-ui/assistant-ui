import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { registry } from "../../../../registry/src/registry";
import { CATALOG_ITEMS } from "../../../lib/catalog";
import { assistantUi } from "../../../lib/catalog/products/assistant-ui";

const source = readFileSync(
  join(process.cwd(), "components/pages/elements/registry.tsx"),
  "utf8",
);

const entries = new Map(
  source
    .slice(source.indexOf("export const ELEMENT_SECTIONS"))
    .split(/\n {8}slug: "/)
    .slice(1)
    .map((chunk) => {
      const slug = chunk.slice(0, chunk.indexOf('"'));
      const entry = chunk.slice(0, chunk.indexOf("\n      },"));
      return [
        slug,
        entry.match(/\n {8}registryName:\s*"([^"]+)"/)?.[1] ??
          `elements-${slug}`,
      ] as const;
    }),
);

it("previews every product with an element that has a demo", () => {
  const previews = CATALOG_ITEMS.flatMap((item) =>
    item.preview === undefined ? [] : [item.preview],
  );
  expect(previews.length).toBeGreaterThan(0);
  expect(previews.filter((slug) => !entries.has(slug))).toEqual([]);
});

it("lists in the bundle exactly the elements the thread installs", () => {
  const thread = registry.find((item) => item.name === "thread");
  const installed = [
    "thread",
    ...(thread?.registryDependencies ?? []).flatMap((dependency) => {
      const name = dependency.match(
        /^https:\/\/r\.assistant-ui\.com\/(.+)\.json$/,
      )?.[1];
      return name === undefined ? [] : [name];
    }),
  ];
  expect(
    (assistantUi.bundle ?? []).map((slug) => entries.get(slug)).sort(),
  ).toEqual(installed.sort());
});
