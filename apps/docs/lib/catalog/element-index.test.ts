import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { ELEMENT_INDEX } from "./element-index";

const field = (entry: string, key: string) =>
  entry.match(new RegExp(`\\n\\s+${key}:\\s*\\n?\\s*"([^"]+)"`))?.[1];

it("mirrors the installable entries of the elements registry", () => {
  const source = readFileSync(
    join(process.cwd(), "components/pages/elements/registry.tsx"),
    "utf8",
  );
  const entries = source
    .slice(source.indexOf("export const ELEMENT_SECTIONS"))
    .split(/\n\s+slug: "/)
    .slice(1)
    .filter((entry) => !/\n\s+generative: true/.test(entry))
    .map((entry) => {
      const slug = entry.slice(0, entry.indexOf('"'));
      return [
        slug,
        field(entry, "title"),
        field(entry, "registryName") ??
          `elements-${field(entry, "installName") ?? slug}`,
        /\n\s+connection: "AUI"/.test(entry),
      ];
    });
  expect(ELEMENT_INDEX).toEqual(entries);
});
