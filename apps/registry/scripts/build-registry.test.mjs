import assert from "node:assert/strict";
import test from "node:test";
import "tsx/esm";

const {
  createBaseRegistryItem,
  createRadixRegistryItem,
  getBaseVariantSourcePath,
  validateBaseVariantContent,
  validateRadixPassDidNotReadBaseSources,
  validateVariantTreesDiffer,
} = await import("./build-registry.ts");

const createBuilt = (
  name,
  files,
  { readPaths = [], baseVariantOutputPaths } = {},
) => ({
  payload: {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:ui",
    files: files.map(([filePath, content]) => ({
      path: filePath,
      type: "registry:ui",
      content,
    })),
  },
  readPaths,
  baseVariantOutputPaths:
    baseVariantOutputPaths ?? files.map(([filePath]) => filePath),
});

test("base registry item merges, rewrites, and deduplicates dependencies in order", () => {
  const item = {
    name: "example",
    type: "registry:ui",
    registryDependencies: [
      "https://r.assistant-ui.com/thread.json",
      "tooltip",
      "https://example.com/foreign.json",
      "https://r.assistant-ui.com/base/message.json",
    ],
    baseRegistryDependencies: [
      "https://r.assistant-ui.com/thread.json",
      "popover",
      "https://r.assistant-ui.com/message.json",
    ],
  };

  assert.deepEqual(createBaseRegistryItem(item), {
    name: "example",
    type: "registry:ui",
    registryDependencies: [
      "https://r.assistant-ui.com/base/thread.json",
      "tooltip",
      "https://example.com/foreign.json",
      "https://r.assistant-ui.com/base/message.json",
      "popover",
    ],
  });
});

test("base registry item rewriting is idempotent", () => {
  const once = createBaseRegistryItem({
    name: "example",
    type: "registry:ui",
    registryDependencies: ["https://r.assistant-ui.com/base/thread.json"],
    baseRegistryDependencies: ["https://r.assistant-ui.com/thread.json"],
  });
  const twice = createBaseRegistryItem(once);

  assert.deepEqual(twice, once);
  assert.deepEqual(once.registryDependencies, [
    "https://r.assistant-ui.com/base/thread.json",
  ]);
});

test("radix registry item removes base-only dependencies without rewriting", () => {
  assert.deepEqual(
    createRadixRegistryItem({
      name: "example",
      type: "registry:ui",
      registryDependencies: [
        "https://r.assistant-ui.com/thread.json",
        "tooltip",
      ],
      baseRegistryDependencies: ["https://r.assistant-ui.com/popover.json"],
    }),
    {
      name: "example",
      type: "registry:ui",
      registryDependencies: [
        "https://r.assistant-ui.com/thread.json",
        "tooltip",
      ],
    },
  );
});

test("base variant source path replaces only the .tsx suffix", () => {
  assert.equal(
    getBaseVariantSourcePath("components/ui/button.tsx"),
    "components/ui/button.base.tsx",
  );
  assert.equal(getBaseVariantSourcePath("components/ui/button.ts"), null);
  assert.equal(getBaseVariantSourcePath("components/ui/button.jsx"), null);
  assert.equal(getBaseVariantSourcePath("components/ui/button"), null);
});

test("base variant content validation accepts clean content", () => {
  assert.doesNotThrow(() =>
    validateBaseVariantContent([
      createBuilt("clean", [
        ["components/clean.tsx", "export const clean = true;"],
      ]),
    ]),
  );
});

test("base variant content validation aggregates forbidden tokens across files", () => {
  assert.throws(
    () =>
      validateBaseVariantContent([
        createBuilt("first", [
          ["components/first.tsx", "const trigger = <Button asChild />;"],
        ]),
        createBuilt("second", [
          [
            "components/second.tsx",
            'import { Tooltip } from "radix-ui"; const styles = "delayDuration data-[state=open]";',
          ],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid base variant content:/);
      assert.ok(
        error.message.includes(
          "- first: base variant for components/first.tsx contains forbidden asChild",
        ),
      );
      assert.ok(
        error.message.includes(
          "- second: base variant for components/second.tsx contains forbidden delayDuration",
        ),
      );
      assert.ok(
        error.message.includes(
          '- second: base variant for components/second.tsx contains forbidden from "radix-ui"',
        ),
      );
      assert.ok(
        error.message.includes(
          "- second: base variant for components/second.tsx contains forbidden data-[state=",
        ),
      );
      assert.equal(
        error.message.split("\n").filter((line) => line.startsWith("- "))
          .length,
        4,
      );
      return true;
    },
  );
});

test("radix source validation aggregates every base variant path read", () => {
  assert.throws(
    () =>
      validateRadixPassDidNotReadBaseSources([
        createBuilt("first", [], {
          readPaths: ["components/first.base.tsx"],
        }),
        createBuilt("second", [], {
          readPaths: ["components/second.tsx", "components/second.base.tsx"],
        }),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(
        error.message.includes(
          "- first: radix registry pass read base variant path components/first.base.tsx",
        ),
      );
      assert.ok(
        error.message.includes(
          "- second: radix registry pass read base variant path components/second.base.tsx",
        ),
      );
      return true;
    },
  );
});

test("variant tree validation aggregates identical radix and base content", () => {
  const radixBuilt = [
    createBuilt("first", [["components/first.tsx", "same first"]]),
    createBuilt("second", [["components/second.tsx", "same second"]]),
  ];
  const baseBuilt = [
    createBuilt("first", [["components/first.tsx", "same first"]]),
    createBuilt("second", [["components/second.tsx", "same second"]]),
  ];

  assert.throws(
    () => validateVariantTreesDiffer(radixBuilt, baseBuilt),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(
        error.message.includes(
          "- first: radix and base content for components/first.tsx are identical despite a .base.tsx variant",
        ),
      );
      assert.ok(
        error.message.includes(
          "- second: radix and base content for components/second.tsx are identical despite a .base.tsx variant",
        ),
      );
      return true;
    },
  );
});
