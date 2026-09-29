import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NATIVE_ELEMENT_SLUGS, getNativeRegistryName } from "./native-elements";

const registrySource = readFileSync(
  join(process.cwd(), "../registry/src/registry.ts"),
  "utf8",
);
const nativeStart = registrySource.indexOf("export const nativeRegistry");
const nativeSection = registrySource.slice(
  nativeStart,
  registrySource.indexOf("\n];", nativeStart),
);
const nativeItems = new Set([
  ...[...nativeSection.matchAll(/^\s+name: "([^"]+)"/gm)].map((m) => m[1]),
  ...[...nativeSection.matchAll(/^\s+slug: "([^"]+)"/gm)].map(
    (m) => `elements-${m[1]}`,
  ),
]);

const guide = readFileSync(
  join(process.cwd(), "content/docs/react-native/elements.mdx"),
  "utf8",
);

describe("native elements", () => {
  it("only maps catalog slugs to items the native registry serves", () => {
    expect(nativeItems.size).toBeGreaterThan(0);
    for (const slug of NATIVE_ELEMENT_SLUGS) {
      expect(nativeItems.has(getNativeRegistryName(slug)!), slug).toBe(true);
    }
  });

  it("has a showcase route for every slug the phone frame loads", () => {
    for (const slug of NATIVE_ELEMENT_SLUGS) {
      expect(
        existsSync(
          join(
            process.cwd(),
            `../../examples/with-expo/app/showcase/${slug}.tsx`,
          ),
        ),
        slug,
      ).toBe(true);
    }
  });

  it("lists every native registry item in the React Native elements guide", () => {
    for (const item of nativeItems) {
      expect(guide, item).toContain(`\`${item}\``);
    }
  });
});
