import assert from "node:assert/strict";
import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import test from "node:test";
import "tsx/esm";

const {
  buildRegistry,
  collectAttributeSelectorValues,
  createRegistryPayload,
  writePackagedFiles,
  createRegistryDependencyUsageExemptions,
  createBaseRegistryItem,
  createRadixRegistryItem,
  expandBundledRegistryDependencies,
  getRadixVariantSourcePath,
  getRelativeImportCandidates,
  validateRegistryInstallMetadata,
  validateBasePassDidNotReadRadixSources,
  validateBaseTreeRadixImports,
  validateBaseVariantContent,
  validateEmittedSpecifierHygiene,
  validateStyleScopedDependencies,
  validateUniversalItems,
  validateVueFlavorContent,
  validateVariantExportParity,
  validateVariantSlotParity,
  validateVariantTreesDiffer,
} = await import("./build-registry.ts");

const { generativeUiVocabularyCss } =
  await import("../../../packages/ui/src/lib/generative-ui-vocabulary-css.ts");
const {
  TEXT_SIZES,
  WEIGHTS,
  COLORS,
  ALIGNS,
  JUSTIFIES,
  BUTTON_STYLES,
  ALERT_TONES,
  IMAGE_SIZE_TOKENS,
} = await import("../../../packages/react-generative-ui/src/ir.ts");

const createBuilt = (
  name,
  files,
  {
    readPaths = [],
    radixVariantOutputPaths = [],
    sourceContentsByOutputPath,
  } = {},
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
  radixVariantOutputPaths,
  sourceContentsByOutputPath:
    sourceContentsByOutputPath ??
    new Map(files.map(([filePath, content]) => [filePath, content])),
});

test("packaged file routes are served as text", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );

  for (const source of ["/files/(.*)", "/base/files/(.*)"]) {
    const rule = config.headers?.find((entry) => entry.source === source);
    assert.ok(rule, `missing header rule for ${source}`);
    assert.deepEqual(rule.headers, [
      { key: "Content-Type", value: "text/plain; charset=utf-8" },
    ]);
  }
});

test("vue registry build emits self-contained staged items", async () => {
  const { registry, stagedVueRegistry } = await import("../src/registry.ts");
  await buildRegistry(registry, stagedVueRegistry);

  const [registryContent, threadContent, threadListContent] = await Promise.all(
    [
      readFile("dist/vue/registry.json", "utf8"),
      readFile("dist/vue/thread.json", "utf8"),
      readFile("dist/vue/thread-list.json", "utf8"),
    ],
  );
  const vueIndex = JSON.parse(registryContent);
  const thread = JSON.parse(threadContent);
  const threadList = JSON.parse(threadListContent);
  const threadFile = thread.files.find(
    (file) => file.path === "components/assistant-ui/thread.vue",
  );
  const threadListFile = threadList.files.find(
    (file) => file.path === "components/assistant-ui/thread-list.vue",
  );

  assert.ok(
    threadFile,
    "vue thread registry output includes components/assistant-ui/thread.vue",
  );
  assert.ok(
    threadListFile,
    "vue thread list registry output includes components/assistant-ui/thread-list.vue",
  );
  assert.deepEqual(
    vueIndex.items.map((item) => item.name),
    ["thread-list", "thread"],
  );
  assert.deepEqual(thread.dependencies, [
    "@assistant-ui/core",
    "@assistant-ui/vue",
    "@lucide/vue",
    "markdown-it",
  ]);
  assert.deepEqual(thread.devDependencies, ["@types/markdown-it"]);
  assert.equal("target" in threadFile, false);
  assert.deepEqual(threadList.dependencies, [
    "@assistant-ui/vue",
    "reka-ui",
    "@lucide/vue",
  ]);
  assert.equal("target" in threadListFile, false);
  assert.match(threadFile.content, /import Message from "\.\/message\.vue"/);
  assert.match(threadListFile.content, /from "reka-ui"/);
});

test("emitted vue artifacts compile as SFCs and pass the vue purity gate", async () => {
  const { parse, compileScript } = await import("@vue/compiler-sfc");
  const [thread, threadList] = await Promise.all([
    readFile("dist/vue/thread.json", "utf8").then(JSON.parse),
    readFile("dist/vue/thread-list.json", "utf8").then(JSON.parse),
  ]);
  const threadEmitted = thread.files.map((file) => [file.path, file.content]);
  const threadListEmitted = threadList.files.map((file) => [
    file.path,
    file.content,
  ]);
  assert.deepEqual(threadEmitted.map(([outputPath]) => outputPath).sort(), [
    "components/assistant-ui/markdown-text.vue",
    "components/assistant-ui/message.vue",
    "components/assistant-ui/thread.vue",
  ]);
  assert.deepEqual(
    threadListEmitted.map(([outputPath]) => outputPath),
    ["components/assistant-ui/thread-list.vue"],
  );

  for (const [outputPath, content] of [
    ...threadEmitted,
    ...threadListEmitted,
  ]) {
    const { descriptor, errors } = parse(content, { filename: outputPath });
    assert.deepEqual(errors, []);
    const compiled = compileScript(descriptor, { id: outputPath });
    assert.ok(compiled.content.length > 0);
  }

  validateVueFlavorContent([
    createBuilt("thread", threadEmitted),
    createBuilt("thread-list", threadListEmitted),
  ]);
});

test("the production vue registry stays empty until the publish flip", async () => {
  const { registry, vueRegistry } = await import("../src/registry.ts");
  assert.deepEqual(vueRegistry, []);
  await buildRegistry(registry, vueRegistry);
  const vueIndex = JSON.parse(await readFile("dist/vue/registry.json", "utf8"));
  assert.deepEqual(vueIndex.items, []);
});

test("vue payload parsing fails on a malformed sfc", () => {
  assert.throws(
    () =>
      validateVueFlavorContent([
        {
          name: "broken",
          payload: {
            files: [
              {
                path: "components/assistant-ui/broken.vue",
                content:
                  "<script setup>const a = 1</script>\n<script setup>const b = 2</script>",
              },
            ],
          },
        },
      ]),
    /Failed to parse/,
  );
});

test("vue registry build removes stale output", async () => {
  await mkdir("dist/vue", { recursive: true });
  await writeFile("dist/vue/stale.json", "{}", "utf8");
  await buildRegistry([], []);
  await assert.rejects(() => access("dist/vue/stale.json"));
});

test("vue flavor content validation rejects forbidden package subpaths", () => {
  assert.throws(
    () =>
      validateVueFlavorContent([
        createBuilt("thread", [
          [
            "components/assistant-ui/thread.vue",
            '<script setup lang="ts">\nimport { jsx } from "react/jsx-runtime";\nimport "react-dom/client";\nimport "@assistant-ui/react/runtime";\nimport { CopyIcon } from "lucide-react";\nimport "@assistant-ui/react";\n</script>',
          ],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid vue flavor content:/);
      assert.ok(
        error.message.includes(
          '- thread: vue tree file components/assistant-ui/thread.vue imports forbidden "react/jsx-runtime"',
        ),
      );
      assert.ok(
        error.message.includes(
          '- thread: vue tree file components/assistant-ui/thread.vue imports forbidden "react-dom/client"',
        ),
      );
      assert.ok(
        error.message.includes(
          '- thread: vue tree file components/assistant-ui/thread.vue imports forbidden "@assistant-ui/react/runtime"',
        ),
      );
      assert.ok(
        error.message.includes(
          '- thread: vue tree file components/assistant-ui/thread.vue imports forbidden "lucide-react"',
        ),
      );
      assert.ok(
        error.message.includes(
          '- thread: vue tree file components/assistant-ui/thread.vue imports forbidden "@assistant-ui/react"',
        ),
      );
      return true;
    },
  );
});

test("vue flavor content validation scans script tags closed with whitespace", () => {
  assert.throws(
    () =>
      validateVueFlavorContent([
        createBuilt("thread", [
          [
            "components/assistant-ui/thread.vue",
            '<script setup lang="ts">\nimport { createElement } from "react";\n</script \t\nbar>',
          ],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid vue flavor content:/);
      assert.ok(
        error.message.includes(
          '- thread: vue tree file components/assistant-ui/thread.vue imports forbidden "react"',
        ),
      );
      return true;
    },
  );
});

test("vue flavor content validation rejects unsupported script languages", () => {
  assert.throws(
    () =>
      validateVueFlavorContent([
        createBuilt("thread", [
          [
            "components/assistant-ui/thread.vue",
            '<script setup lang="tsx">\nconst thread = <div />;\n</script>',
          ],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid vue flavor content:/);
      assert.ok(
        error.message.includes(
          '- thread: vue tree file components/assistant-ui/thread.vue has unsupported script lang "tsx"',
        ),
      );
      return true;
    },
  );
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
    radixRegistryDependencies: ["input"],
    registryDependencyUsageExemptions: {
      "https://example.com/foreign.json": "Installs external theme metadata.",
    },
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

test("radix registry item merges radix-only registry dependencies and removes base-only ones", () => {
  assert.deepEqual(
    createRadixRegistryItem({
      name: "example",
      type: "registry:ui",
      registryDependencies: [
        "https://r.assistant-ui.com/thread.json",
        "tooltip",
      ],
      radixRegistryDependencies: ["tooltip", "input"],
      baseRegistryDependencies: ["https://r.assistant-ui.com/popover.json"],
      registryDependencyUsageExemptions: {
        tooltip: "Installs tooltip styles selected at runtime.",
      },
    }),
    {
      name: "example",
      type: "registry:ui",
      registryDependencies: [
        "https://r.assistant-ui.com/thread.json",
        "tooltip",
        "input",
      ],
    },
  );
});

test("radix variant source path replaces only the .tsx suffix", () => {
  assert.equal(
    getRadixVariantSourcePath("components/ui/button.tsx"),
    "components/ui/button.radix.tsx",
  );
  assert.equal(getRadixVariantSourcePath("components/ui/button.ts"), null);
  assert.equal(getRadixVariantSourcePath("components/ui/button.jsx"), null);
  assert.equal(getRadixVariantSourcePath("components/ui/button"), null);
});

test("base variant content validation accepts clean content", () => {
  const radixBuilt = [
    createBuilt("clean", [["components/clean.tsx", "radix content"]], {
      radixVariantOutputPaths: ["components/clean.tsx"],
    }),
  ];
  const baseBuilt = [
    createBuilt("clean", [
      ["components/clean.tsx", "export const clean = true;"],
    ]),
  ];

  assert.doesNotThrow(() => validateBaseVariantContent(radixBuilt, baseBuilt));
});

test("emitted specifier hygiene aggregates marked UI specifiers", () => {
  assert.throws(
    () =>
      validateEmittedSpecifierHygiene([
        createBuilt("radix", [
          ["components/radix.tsx", 'import "@/components/ui/radix/button";'],
        ]),
        createBuilt("base", [
          ["components/base.tsx", 'import "@/components/ui/base/button";'],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid emitted UI specifiers:/);
      assert.ok(
        error.message.includes(
          "- radix: components/radix.tsx contains @/components/ui/radix/",
        ),
      );
      assert.ok(
        error.message.includes(
          "- base: components/base.tsx contains @/components/ui/base/",
        ),
      );
      return true;
    },
  );

  assert.doesNotThrow(() =>
    validateEmittedSpecifierHygiene([
      createBuilt("clean", [
        ["components/clean.tsx", 'import "@/components/ui/button";'],
      ]),
    ]),
  );
});

test("base tree radix import validation catches fallback payloads", () => {
  assert.throws(
    () =>
      validateBaseTreeRadixImports([
        createBuilt("fallback", [
          ["components/fallback.tsx", 'import { Tooltip } from "radix-ui";'],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid base tree imports:/);
      assert.ok(
        error.message.includes(
          "- fallback: base tree file components/fallback.tsx imports radix",
        ),
      );
      return true;
    },
  );

  assert.throws(
    () =>
      validateBaseTreeRadixImports([
        createBuilt("scoped", [
          [
            "components/scoped.tsx",
            'import { Tooltip } from "@radix-ui/react-tooltip";',
          ],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(
        error.message.includes(
          "- scoped: base tree file components/scoped.tsx imports radix",
        ),
      );
      return true;
    },
  );

  assert.throws(
    () =>
      validateBaseTreeRadixImports([
        createBuilt("side-effect", [
          [
            "components/side-effect.tsx",
            'import "@radix-ui/themes/styles.css";',
          ],
        ]),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(
        error.message.includes(
          "- side-effect: base tree file components/side-effect.tsx imports radix",
        ),
      );
      return true;
    },
  );

  assert.doesNotThrow(() =>
    validateBaseTreeRadixImports([
      createBuilt("clean", [
        [
          "components/clean.tsx",
          'export const styles = "data-radix-thing"; export const clean = true;',
        ],
      ]),
    ]),
  );
});

test("base variant content validation reports plain and scoped radix imports", () => {
  assert.throws(
    () =>
      validateBaseVariantContent(
        [
          createBuilt("plain", [["components/plain.tsx", "radix content"]], {
            radixVariantOutputPaths: ["components/plain.tsx"],
          }),
        ],
        [
          createBuilt("plain", [
            ["components/plain.tsx", 'import { Tooltip } from "radix-ui";'],
          ]),
        ],
      ),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(
        error.message.includes(
          "- plain: base variant for components/plain.tsx contains forbidden radix import",
        ),
      );
      return true;
    },
  );

  assert.throws(
    () =>
      validateBaseVariantContent(
        [
          createBuilt("scoped", [["components/scoped.tsx", "radix content"]], {
            radixVariantOutputPaths: ["components/scoped.tsx"],
          }),
        ],
        [
          createBuilt("scoped", [
            [
              "components/scoped.tsx",
              'import { Tooltip } from "@radix-ui/react-tooltip";',
            ],
          ]),
        ],
      ),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(
        error.message.includes(
          "- scoped: base variant for components/scoped.tsx contains forbidden radix import",
        ),
      );
      return true;
    },
  );

  assert.doesNotThrow(() =>
    validateBaseVariantContent(
      [
        createBuilt("clean", [["components/clean.tsx", "radix content"]], {
          radixVariantOutputPaths: ["components/clean.tsx"],
        }),
      ],
      [
        createBuilt("clean", [
          ["components/clean.tsx", "export const clean = true;"],
        ]),
      ],
    ),
  );
});

test("base variant content validation aggregates forbidden tokens across files", () => {
  const radixBuilt = [
    createBuilt("first", [["components/first.tsx", "radix content"]], {
      radixVariantOutputPaths: ["components/first.tsx"],
    }),
    createBuilt("second", [["components/second.tsx", "radix content"]], {
      radixVariantOutputPaths: ["components/second.tsx"],
    }),
  ];
  const baseBuilt = [
    createBuilt("first", [
      ["components/first.tsx", "const trigger = <Button asChild />;"],
    ]),
    createBuilt("second", [
      [
        "components/second.tsx",
        'import { Tooltip } from "radix-ui"; const styles = "delayDuration data-[state=open]";',
      ],
    ]),
  ];

  assert.throws(
    () => validateBaseVariantContent(radixBuilt, baseBuilt),
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
          "- second: base variant for components/second.tsx contains forbidden radix import",
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

test("base source validation aggregates every radix variant path read", () => {
  assert.throws(
    () =>
      validateBasePassDidNotReadRadixSources([
        createBuilt("first", [], {
          readPaths: ["components/first.radix.tsx"],
        }),
        createBuilt("second", [], {
          readPaths: ["components/second.tsx", "components/second.radix.tsx"],
        }),
      ]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(
        error.message.includes(
          "- first: base registry pass read radix variant path components/first.radix.tsx",
        ),
      );
      assert.ok(
        error.message.includes(
          "- second: base registry pass read radix variant path components/second.radix.tsx",
        ),
      );
      return true;
    },
  );
});

test("variant tree validation aggregates identical radix and base sources", () => {
  const radixBuilt = [
    createBuilt("first", [["components/first.tsx", "same first"]], {
      radixVariantOutputPaths: ["components/first.tsx"],
    }),
    createBuilt("second", [["components/second.tsx", "same second"]], {
      radixVariantOutputPaths: ["components/second.tsx"],
    }),
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
          "- first: radix and base sources for components/first.tsx are identical despite a .radix.tsx variant",
        ),
      );
      assert.ok(
        error.message.includes(
          "- second: radix and base sources for components/second.tsx are identical despite a .radix.tsx variant",
        ),
      );
      return true;
    },
  );
});

test("variant tree validation accepts identical emitted content when sources differ", () => {
  const radixBuilt = [
    createBuilt("widget", [["components/widget.tsx", "shared emitted"]], {
      radixVariantOutputPaths: ["components/widget.tsx"],
      sourceContentsByOutputPath: new Map([
        ["components/widget.tsx", 'import "@/components/ui/collapsible";'],
      ]),
    }),
  ];
  const baseBuilt = [
    createBuilt("widget", [["components/widget.tsx", "shared emitted"]], {
      sourceContentsByOutputPath: new Map([
        ["components/widget.tsx", 'import "@/components/ui-base/collapsible";'],
      ]),
    }),
  ];

  assert.doesNotThrow(() => validateVariantTreesDiffer(radixBuilt, baseBuilt));
});

test("variant tree validation skips components without a radix variant", () => {
  const radixBuilt = [
    createBuilt("plain", [["components/plain.tsx", "same content"]]),
  ];
  const baseBuilt = [
    createBuilt("plain", [["components/plain.tsx", "same content"]]),
  ];

  assert.doesNotThrow(() => validateVariantTreesDiffer(radixBuilt, baseBuilt));
});

test("radix registry item merges and dedupes radixDependencies into dependencies", () => {
  assert.deepEqual(
    createRadixRegistryItem({
      name: "example",
      type: "registry:ui",
      dependencies: ["lucide-react", "radix-ui"],
      radixDependencies: ["radix-ui", "class-variance-authority"],
      baseDependencies: ["@base-ui/react"],
      baseRegistryDependencies: ["popover"],
    }),
    {
      name: "example",
      type: "registry:ui",
      dependencies: ["lucide-react", "radix-ui", "class-variance-authority"],
    },
  );
});

test("radix registry item omits dependencies when neither source list exists", () => {
  assert.deepEqual(
    createRadixRegistryItem({
      name: "example",
      type: "registry:ui",
      baseDependencies: ["@base-ui/react"],
      baseRegistryDependencies: ["popover"],
    }),
    {
      name: "example",
      type: "registry:ui",
    },
  );
});

test("base registry item merges baseDependencies and drops radixDependencies", () => {
  assert.deepEqual(
    createBaseRegistryItem({
      name: "example",
      type: "registry:ui",
      dependencies: ["lucide-react", "@base-ui/react"],
      baseDependencies: ["@base-ui/react", "clsx"],
      radixDependencies: ["radix-ui"],
    }),
    {
      name: "example",
      type: "registry:ui",
      dependencies: ["lucide-react", "@base-ui/react", "clsx"],
    },
  );
});

const bundleFixtures = () => {
  const thread = {
    name: "thread",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/thread.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    radixDependencies: ["radix-ui"],
    registryDependencies: [
      "button",
      "https://r.assistant-ui.com/reasoning.json",
    ],
    radixRegistryDependencies: ["input"],
    baseRegistryDependencies: ["popover"],
  };
  const reasoning = {
    name: "reasoning",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/reasoning.tsx",
      },
    ],
    dependencies: ["tw-shimmer"],
    registryDependencies: ["collapsible"],
    css: { '@import "tw-shimmer"': {} },
  };

  return {
    item: {
      name: "eve-chat",
      type: "registry:item",
      files: [
        { type: "registry:file", path: "app/page.tsx", target: "app/page.tsx" },
      ],
      dependencies: ["@assistant-ui/eve"],
      bundledRegistryDependencies: ["https://r.assistant-ui.com/thread.json"],
    },
    itemsByName: new Map(
      [thread, reasoning].map((dependencyItem) => [
        dependencyItem.name,
        dependencyItem,
      ]),
    ),
  };
};

test("bundling inlines the closure as targeted files and merges its dependencies and css", () => {
  const { item, itemsByName } = bundleFixtures();

  const expanded = expandBundledRegistryDependencies(
    item,
    itemsByName,
    "radix",
  );

  assert.equal(expanded.bundledRegistryDependencies, undefined);
  assert.equal(expanded.registryDependencies, undefined);
  assert.deepEqual(
    expanded.files.map((file) => [file.type, file.target, file.sourcePath]),
    [
      ["registry:file", "app/page.tsx", undefined],
      [
        "registry:file",
        "components/assistant-ui/thread.tsx",
        "../../packages/ui/src/components/react/assistant-ui/thread.tsx",
      ],
      ["registry:file", "components/assistant-ui/reasoning.tsx", undefined],
      [
        "registry:file",
        "components/ui/button.tsx",
        "../../packages/ui/src/components/react/ui/radix/button.tsx",
      ],
      [
        "registry:file",
        "components/ui/collapsible.tsx",
        "../../packages/ui/src/components/react/ui/radix/collapsible.tsx",
      ],
      [
        "registry:file",
        "components/ui/input.tsx",
        "../../packages/ui/src/components/react/ui/radix/input.tsx",
      ],
    ],
  );
  assert.deepEqual(expanded.dependencies, [
    "@assistant-ui/eve",
    "@assistant-ui/react",
    "tw-shimmer",
  ]);
  assert.deepEqual(expanded.radixDependencies, ["radix-ui"]);
  assert.deepEqual(Object.keys(expanded.css), ['@import "tw-shimmer"']);
});

test("bundling sources ui primitives and their package from the requested flavor", () => {
  const { item, itemsByName } = bundleFixtures();

  const expanded = expandBundledRegistryDependencies(item, itemsByName, "base");

  assert.deepEqual(
    expanded.files
      .filter((file) => file.target.startsWith("components/ui/"))
      .map((file) => file.sourcePath),
    [
      "../../packages/ui/src/components/react/ui/base/button.tsx",
      "../../packages/ui/src/components/react/ui/base/collapsible.tsx",
      "../../packages/ui/src/components/react/ui/base/popover.tsx",
    ],
  );
  assert.deepEqual(expanded.baseDependencies, ["@base-ui/react"]);
});

test("bundling leaves an item without bundled dependencies untouched and rejects an unknown target", () => {
  const item = {
    name: "thread",
    type: "registry:component",
    dependencies: ["@assistant-ui/react"],
  };

  assert.deepEqual(
    expandBundledRegistryDependencies(item, new Map(), "radix"),
    item,
  );
  assert.throws(
    () =>
      expandBundledRegistryDependencies(
        {
          name: "eve-chat",
          type: "registry:item",
          bundledRegistryDependencies: [
            "https://r.assistant-ui.com/missing.json",
          ],
        },
        new Map(),
        "radix",
      ),
    /eve-chat: bundled registry dependency "https:\/\/r\.assistant-ui\.com\/missing\.json" does not match a local registry item/,
  );
});

test("bundling rejects a foreign registry url inside the closure", () => {
  const thread = {
    name: "thread",
    type: "registry:component",
    registryDependencies: ["https://example.com/foreign.json"],
  };

  assert.throws(
    () =>
      expandBundledRegistryDependencies(
        {
          name: "eve-chat",
          type: "registry:item",
          bundledRegistryDependencies: [
            "https://r.assistant-ui.com/thread.json",
          ],
        },
        new Map([["thread", thread]]),
        "radix",
      ),
    /eve-chat: bundled closure depends on foreign registry item "https:\/\/example\.com\/foreign\.json", which cannot be inlined/,
  );
});

test("universal item validation rejects a bundled item a partial config cannot install", () => {
  const items = [
    {
      name: "eve-chat",
      type: "registry:page",
      files: [
        { type: "registry:page", path: "app/page.tsx", target: "app/page.tsx" },
        {
          type: "registry:component",
          path: "components/assistant-ui/thread.tsx",
        },
      ],
      registryDependencies: ["button"],
    },
    {
      name: "thread",
      type: "registry:component",
      files: [
        {
          type: "registry:component",
          path: "components/assistant-ui/thread.tsx",
        },
      ],
    },
  ];

  assert.throws(
    () => validateUniversalItems(items, new Set(["eve-chat"])),
    (error) =>
      error.message.includes(
        'eve-chat: type "registry:page" is not installable without a full project config',
      ) &&
      error.message.includes(
        "eve-chat: components/assistant-ui/thread.tsx needs an explicit target and a universal file type",
      ) &&
      error.message.includes('eve-chat: registry dependency "button"') &&
      !error.message.includes("thread:"),
  );
  assert.doesNotThrow(() => validateUniversalItems(items, new Set()));
});

test("slot parity reports mismatched data-slot attributes", () => {
  const radixBuilt = [
    createBuilt(
      "button",
      [
        [
          "components/button.tsx",
          '<button data-slot="button" data-slot="button-icon" />',
        ],
      ],
      { radixVariantOutputPaths: ["components/button.tsx"] },
    ),
  ];
  const baseBuilt = [
    createBuilt("button", [
      ["components/button.tsx", '<button data-slot="button" />'],
    ]),
  ];

  assert.throws(
    () => validateVariantSlotParity(radixBuilt, baseBuilt),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid variant slot parity:/);
      assert.ok(error.message.includes("button"));
      assert.ok(error.message.includes("components/button.tsx"));
      assert.ok(error.message.includes("button-icon"));
      assert.ok(
        error.message.includes(
          "- button: data-slot attributes differ for components/button.tsx (radix-only: button-icon)",
        ),
      );
      return true;
    },
  );
});

test("slot parity accepts identical slot sets and skips components without a radix variant", () => {
  assert.doesNotThrow(() =>
    validateVariantSlotParity(
      [
        createBuilt(
          "button",
          [["components/button.tsx", '<button data-slot="button" />']],
          { radixVariantOutputPaths: ["components/button.tsx"] },
        ),
        createBuilt("plain", [["components/plain.tsx", "export const x = 1;"]]),
      ],
      [
        createBuilt("button", [
          ["components/button.tsx", '<div data-slot="button" />'],
        ]),
        createBuilt("plain", [["components/plain.tsx", "export const y = 2;"]]),
      ],
    ),
  );
});

test("slot parity counts object-prop slots the same as jsx-attribute slots", () => {
  assert.doesNotThrow(() =>
    validateVariantSlotParity(
      [
        createBuilt(
          "badge",
          [["components/badge.tsx", '<span data-slot="badge" />']],
          { radixVariantOutputPaths: ["components/badge.tsx"] },
        ),
      ],
      [
        createBuilt("badge", [
          [
            "components/badge.tsx",
            'useRender({ props: { "data-slot": "badge" } });',
          ],
        ]),
      ],
    ),
  );
});

test("export parity reports exports present only in the radix content", () => {
  const radixBuilt = [
    createBuilt(
      "widget",
      [
        [
          "components/widget.tsx",
          "export function Widget() {}\nexport function Helper() {}",
        ],
      ],
      { radixVariantOutputPaths: ["components/widget.tsx"] },
    ),
  ];
  const baseBuilt = [
    createBuilt("widget", [
      ["components/widget.tsx", "export function Widget() {}"],
    ]),
  ];

  assert.throws(
    () => validateVariantExportParity(radixBuilt, baseBuilt),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid variant export parity:/);
      assert.ok(error.message.includes("widget"));
      assert.ok(error.message.includes("components/widget.tsx"));
      assert.ok(error.message.includes("Helper"));
      assert.ok(
        error.message.includes(
          "- widget: exported symbols differ for components/widget.tsx (radix-only: Helper)",
        ),
      );
      return true;
    },
  );
});

test("export parity treats export { A as B } as B and accepts identical sets", () => {
  assert.throws(
    () =>
      validateVariantExportParity(
        [
          createBuilt(
            "alias",
            [["components/alias.tsx", "const A = 1;\nexport { A as B };"]],
            { radixVariantOutputPaths: ["components/alias.tsx"] },
          ),
        ],
        [
          createBuilt("alias", [
            ["components/alias.tsx", "export function Other() {}"],
          ]),
        ],
      ),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(error.message.includes("radix-only: B"));
      assert.ok(error.message.includes("base-only: Other"));
      return true;
    },
  );

  assert.doesNotThrow(() =>
    validateVariantExportParity(
      [
        createBuilt(
          "same",
          [
            [
              "components/same.tsx",
              "export function Same() {}\nconst A = 1;\nexport { A as B };",
            ],
          ],
          { radixVariantOutputPaths: ["components/same.tsx"] },
        ),
      ],
      [
        createBuilt("same", [
          [
            "components/same.tsx",
            "export function Same() {}\nexport function B() {}",
          ],
        ]),
      ],
    ),
  );
});

test("export parity records default exports as default regardless of local name", () => {
  assert.throws(
    () =>
      validateVariantExportParity(
        [
          createBuilt(
            "widget",
            [["components/widget.tsx", "export default function Widget() {}"]],
            { radixVariantOutputPaths: ["components/widget.tsx"] },
          ),
        ],
        [
          createBuilt("widget", [
            ["components/widget.tsx", "export function Widget() {}"],
          ]),
        ],
      ),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(error.message.includes("radix-only: default"));
      assert.ok(error.message.includes("base-only: Widget"));
      return true;
    },
  );

  assert.doesNotThrow(() =>
    validateVariantExportParity(
      [
        createBuilt(
          "widget",
          [
            [
              "components/widget.tsx",
              "export default function RadixWidget() {}",
            ],
          ],
          { radixVariantOutputPaths: ["components/widget.tsx"] },
        ),
      ],
      [
        createBuilt("widget", [
          ["components/widget.tsx", "export default function BaseWidget() {}"],
        ]),
      ],
    ),
  );
});

test("export parity tracks star and namespace re-exports", () => {
  assert.throws(
    () =>
      validateVariantExportParity(
        [
          createBuilt(
            "widget",
            [
              [
                "components/widget.tsx",
                'export function Widget() {}\nexport * from "./extra";',
              ],
            ],
            { radixVariantOutputPaths: ["components/widget.tsx"] },
          ),
        ],
        [
          createBuilt("widget", [
            ["components/widget.tsx", "export function Widget() {}"],
          ]),
        ],
      ),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(error.message.includes("radix-only: *:./extra"));
      return true;
    },
  );

  assert.throws(
    () =>
      validateVariantExportParity(
        [
          createBuilt(
            "widget",
            [
              [
                "components/widget.tsx",
                'export * as Helpers from "./extra";\nexport function Widget() {}',
              ],
            ],
            { radixVariantOutputPaths: ["components/widget.tsx"] },
          ),
        ],
        [
          createBuilt("widget", [
            ["components/widget.tsx", "export function Widget() {}"],
          ]),
        ],
      ),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(error.message.includes("radix-only: Helpers"));
      return true;
    },
  );
});

test("style-scoped dependencies flag deps used only by the opposite tree", () => {
  const radixOnlyImport = createBuilt("tooltip", [
    [
      "components/tooltip.tsx",
      'import { Tooltip } from "radix-ui";\nexport const TooltipButton = Tooltip;',
    ],
  ]);
  const baseOnlyImport = createBuilt("tooltip", [
    [
      "components/tooltip.tsx",
      'import { Tooltip } from "@base-ui/react";\nexport const TooltipButton = Tooltip;',
    ],
  ]);
  const bothImport = createBuilt("shared", [
    [
      "components/shared.tsx",
      'import { clsx } from "clsx";\nexport const cx = clsx;',
    ],
  ]);
  const neitherImport = createBuilt("unused", [
    ["components/unused.tsx", "export const value = 1;"],
  ]);

  radixOnlyImport.payload.dependencies = ["radix-ui"];
  baseOnlyImport.payload.dependencies = ["radix-ui"];
  bothImport.payload.dependencies = ["clsx"];
  neitherImport.payload.dependencies = ["lodash"];

  assert.throws(
    () => validateStyleScopedDependencies([radixOnlyImport], [baseOnlyImport]),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.match(error.message, /^Invalid style-scoped dependencies:/);
      assert.ok(error.message.includes("radixDependencies"));
      assert.ok(
        error.message.includes(
          '- tooltip: dependency "radix-ui" is declared for the base tree but only used by the radix tree; move it to radixDependencies',
        ),
      );
      return true;
    },
  );

  const radixDeclaresBaseOnly = createBuilt("panel", [
    ["components/panel.tsx", "export const P = true;"],
  ]);
  const baseUsesBaseOnly = createBuilt("panel", [
    [
      "components/panel.tsx",
      'import { Panel } from "@base-ui/react";\nexport const P = Panel;',
    ],
  ]);
  radixDeclaresBaseOnly.payload.dependencies = ["@base-ui/react"];

  assert.throws(
    () =>
      validateStyleScopedDependencies(
        [radixDeclaresBaseOnly],
        [baseUsesBaseOnly],
      ),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.ok(error.message.includes("baseDependencies"));
      assert.ok(
        error.message.includes(
          '- panel: dependency "@base-ui/react" is declared for the radix tree but only used by the base tree; move it to baseDependencies',
        ),
      );
      return true;
    },
  );

  assert.doesNotThrow(() =>
    validateStyleScopedDependencies([bothImport], [bothImport]),
  );

  assert.doesNotThrow(() =>
    validateStyleScopedDependencies([neitherImport], [neitherImport]),
  );
});

test("collectAttributeSelectorValues groups value-selectors by component:attribute and ignores presence-only selectors", () => {
  const css = {
    '[data-aui="text"][data-aui-size="sm"], [data-aui="header"][data-aui-size="sm"]':
      { "font-size": "0.75rem" },
    '[data-aui="text"][data-aui-size="md"]': { "font-size": "0.875rem" },
    '[data-aui="button"][data-aui-block]': { width: "100%" },
    "@media (prefers-reduced-motion: reduce)": {
      ".foo": { transition: "none" },
    },
  };

  const values = collectAttributeSelectorValues(css);

  assert.deepEqual([...(values.get("text:size") ?? [])].sort(), ["md", "sm"]);
  assert.deepEqual([...(values.get("header:size") ?? [])], ["sm"]);
  assert.equal(values.has("button:block"), false);
});

// Every attribute-mapped prop backed by a closed enum, keyed by the components
// that emit it. A shared attribute name (`size`) can carry a different enum per
// component, so contracts are scoped to a component list rather than the bare
// attribute name.
const GENERATIVE_UI_ENUM_CONTRACTS = [
  { components: ["text", "header"], attribute: "size", values: TEXT_SIZES },
  { components: ["text"], attribute: "weight", values: WEIGHTS },
  { components: ["text"], attribute: "color", values: COLORS },
  { components: ["row", "col"], attribute: "align", values: ALIGNS },
  { components: ["row"], attribute: "justify", values: JUSTIFIES },
  { components: ["button"], attribute: "style", values: BUTTON_STYLES },
  { components: ["alert"], attribute: "tone", values: ALERT_TONES },
  { components: ["image"], attribute: "size", values: IMAGE_SIZE_TOKENS },
];

// Attribute-mapped props with no closed enum to check against, one reason each.
const GENERATIVE_UI_EXEMPT_ATTRIBUTES = new Map([
  ["row:gap", "numeric, 4px units; 0 to 8 is the documented supported range"],
  ["col:gap", "numeric, 4px units; 0 to 8 is the documented supported range"],
  ["form:gap", "numeric, 4px units; 0 to 8 is the documented supported range"],
  [
    "card:padding",
    "numeric, 4px units; 0 to 8 is the documented supported range",
  ],
  [
    "chart-series:series",
    "numeric series index; 0 to 4 covers the mark color ladder",
  ],
  [
    "chart-legend-item:series",
    "numeric series index; 0 to 4 covers the legend color ladder",
  ],
  [
    "badge:variant",
    "free string, not sourced from a shared enum; its styled values (info/success/warning/danger) mirror ALERT_TONES",
  ],
  [
    "chart:color",
    "free string, not sourced from a shared enum; supports the same color tokens as Text's color prop as a convention",
  ],
]);

test("every enum value of every attribute-mapped generative-ui prop is styled by at least one css rule", () => {
  const observed = collectAttributeSelectorValues(generativeUiVocabularyCss);
  const findings = [];

  for (const {
    components,
    attribute,
    values,
  } of GENERATIVE_UI_ENUM_CONTRACTS) {
    for (const value of values) {
      const covered = components.some((component) =>
        observed.get(`${component}:${attribute}`)?.has(value),
      );
      if (!covered) {
        findings.push(`${components.join("/")}:${attribute}="${value}"`);
      }
    }
  }

  assert.deepEqual(
    findings,
    [],
    `enum values with no matching css rule: ${findings.join(", ")}`,
  );
});

test("every css value-selector for an attribute-mapped generative-ui prop is a legal schema value", () => {
  const observed = collectAttributeSelectorValues(generativeUiVocabularyCss);
  const findings = [];

  for (const [key, observedValues] of observed) {
    if (GENERATIVE_UI_EXEMPT_ATTRIBUTES.has(key)) continue;

    const contract = GENERATIVE_UI_ENUM_CONTRACTS.find(
      ({ components, attribute }) =>
        components.some((component) => `${component}:${attribute}` === key),
    );

    if (!contract) {
      findings.push(
        `${key} has css rules but is not declared in GENERATIVE_UI_ENUM_CONTRACTS or GENERATIVE_UI_EXEMPT_ATTRIBUTES`,
      );
      continue;
    }

    for (const value of observedValues) {
      if (!contract.values.includes(value)) {
        findings.push(`${key}="${value}" is not a legal enum value`);
      }
    }
  }

  assert.deepEqual(
    findings,
    [],
    `dead or unclassified css value-selectors: ${findings.join(", ")}`,
  );
});

test("every element's sibling imports are declared as registry dependencies", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { registry } = await import("../src/registry.ts");

  const dir = "packages/ui/src/components/react/assistant-ui/elements";
  const declared = new Map(
    registry
      .filter((item) => item.name.startsWith("elements-"))
      .map((item) => [
        item.files[0].path.split("/").pop(),
        new Set(
          (item.registryDependencies ?? [])
            .map((dep) => /elements-([a-z-]+)\.json$/.exec(dep)?.[1])
            .filter(Boolean),
        ),
      ]),
  );

  for (const file of readdirSync(join(process.cwd(), "../..", dir))) {
    if (!file.endsWith(".tsx") || file === "surfaces.tsx") continue;
    const src = readFileSync(join(process.cwd(), "../..", dir, file), "utf8");
    const siblings = [...src.matchAll(/from "\.\/([a-z-]+)"/g)]
      .map((m) => m[1])
      .filter((name) => name !== "surfaces");
    const deps = declared.get(file);
    if (!deps) continue;
    for (const sibling of siblings) {
      assert.ok(
        deps.has(sibling),
        `${file} imports ./${sibling} but elements-${file.replace(".tsx", "")} does not declare it via usesElements`,
      );
    }
  }
});

test("relative import candidates cover extensions, directory indexes, and .js sources", () => {
  const from = "components/assistant-ui/sources.tsx";

  assert.deepEqual(getRelativeImportCandidates("./badge", from), [
    "components/assistant-ui/badge.tsx",
    "components/assistant-ui/badge.ts",
    "components/assistant-ui/badge.jsx",
    "components/assistant-ui/badge.js",
    "components/assistant-ui/badge/index.tsx",
    "components/assistant-ui/badge/index.ts",
    "components/assistant-ui/badge/index.jsx",
    "components/assistant-ui/badge/index.js",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./badge.tsx", from), [
    "components/assistant-ui/badge.tsx",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./styles.css", from), [
    "components/assistant-ui/styles.css",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./badge.js", from), [
    "components/assistant-ui/badge.js",
    "components/assistant-ui/badge.tsx",
    "components/assistant-ui/badge.ts",
    "components/assistant-ui/badge.jsx",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./icon.svg?url", from), [
    "components/assistant-ui/icon.svg",
  ]);

  assert.equal(
    getRelativeImportCandidates("../icons/github", from)[0],
    "components/icons/github.tsx",
  );

  assert.equal(
    getRelativeImportCandidates("../../../outside/thing", from),
    null,
  );
});

test("a dotted basename without a recognized extension probes module and index forms", () => {
  const from = "components/assistant-ui/thread.tsx";

  assert.deepEqual(getRelativeImportCandidates("./tool.config", from), [
    "components/assistant-ui/tool.config.tsx",
    "components/assistant-ui/tool.config.ts",
    "components/assistant-ui/tool.config.jsx",
    "components/assistant-ui/tool.config.js",
    "components/assistant-ui/tool.config/index.tsx",
    "components/assistant-ui/tool.config/index.ts",
    "components/assistant-ui/tool.config/index.jsx",
    "components/assistant-ui/tool.config/index.js",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./thread.v2", from), [
    "components/assistant-ui/thread.v2.tsx",
    "components/assistant-ui/thread.v2.ts",
    "components/assistant-ui/thread.v2.jsx",
    "components/assistant-ui/thread.v2.js",
    "components/assistant-ui/thread.v2/index.tsx",
    "components/assistant-ui/thread.v2/index.ts",
    "components/assistant-ui/thread.v2/index.jsx",
    "components/assistant-ui/thread.v2/index.js",
  ]);
});

test("a recognized asset extension resolves to the literal file only", () => {
  const from = "components/assistant-ui/thread.tsx";

  assert.deepEqual(getRelativeImportCandidates("./globals.css", from), [
    "components/assistant-ui/globals.css",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./logo.png", from), [
    "components/assistant-ui/logo.png",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./tool.config.json", from), [
    "components/assistant-ui/tool.config.json",
  ]);

  assert.deepEqual(getRelativeImportCandidates("./logo.PNG", from), [
    "components/assistant-ui/logo.PNG",
  ]);
});

test("an uppercase module extension still probes TypeScript sources", () => {
  const from = "components/assistant-ui/thread.tsx";

  assert.deepEqual(getRelativeImportCandidates("./legacy.JS", from), [
    "components/assistant-ui/legacy.JS",
    "components/assistant-ui/legacy.tsx",
    "components/assistant-ui/legacy.ts",
    "components/assistant-ui/legacy.jsx",
    "components/assistant-ui/legacy.js",
  ]);
});

test("a sibling whose name begins with dots stays inside the installed tree", () => {
  assert.deepEqual(getRelativeImportCandidates("./..rc.json", "config.tsx"), [
    "..rc.json",
  ]);

  assert.equal(getRelativeImportCandidates("..", "config.tsx"), null);
  assert.equal(getRelativeImportCandidates("../outside", "config.tsx"), null);
});

const componentItem = (files, extra = {}) => ({
  name: "demo",
  type: "registry:component",
  files,
  ...extra,
});

const findingsFrom = (payloads, usageExemptions) => {
  try {
    validateRegistryInstallMetadata(payloads, usageExemptions);
  } catch (error) {
    return error.message;
  }
  return null;
};

test("install validation flags a relative import with no providing file", () => {
  const findings = findingsFrom([
    componentItem([
      {
        path: "components/assistant-ui/thread.tsx",
        content: 'import { Badge } from "./badge";\n',
      },
    ]),
  ]);

  assert.match(findings, /thread\.tsx imports "\.\/badge"/);
  assert.match(findings, /components\/assistant-ui\/badge\.tsx/);
});

test("install validation resolves a sibling through file.target, not file.path", () => {
  const files = [
    {
      path: "packages/ui/src/components/react/assistant-ui/thread.tsx",
      target: "components/assistant-ui/thread.tsx",
      content: 'import { Badge } from "./badge";\n',
    },
    {
      path: "packages/ui/src/components/react/assistant-ui/badge.tsx",
      target: "components/assistant-ui/badge.tsx",
      content: "export const Badge = () => null;\n",
    },
  ];

  assert.equal(findingsFrom([componentItem(files)]), null);

  // Without targets both paths fall back to their authored locations, which are
  // still siblings, so only a mismatched target proves the target is what wins.
  const withoutTargets = files.map(({ path, content }) => ({ path, content }));
  assert.equal(findingsFrom([componentItem(withoutTargets)]), null);

  const targetMismatch = [
    files[0],
    { ...files[1], target: "components/elsewhere/badge.tsx" },
  ];
  assert.match(
    findingsFrom([componentItem(targetMismatch)]),
    /imports "\.\/badge"/,
  );
});

test("install validation reports an import that escapes the installed tree", () => {
  const findings = findingsFrom([
    componentItem([
      {
        path: "components/assistant-ui/thread.tsx",
        content: 'import { helper } from "../../../outside/helper";\n',
      },
    ]),
  ]);

  assert.match(findings, /a file outside the installed tree/);
});

test("install validation resolves a dotted alias basename to its shipped source", () => {
  const importer = {
    path: "components/assistant-ui/thread.tsx",
    content:
      'import { toolConfig } from "@/components/assistant-ui/tool.config";\n',
  };

  for (const providerPath of [
    "components/assistant-ui/tool.config.tsx",
    "components/assistant-ui/tool.config.ts",
    "components/assistant-ui/tool.config/index.tsx",
  ]) {
    assert.equal(
      findingsFrom([
        componentItem([
          importer,
          { path: providerPath, content: "export const toolConfig = {};\n" },
        ]),
      ]),
      null,
    );
  }

  assert.match(
    findingsFrom([componentItem([importer])]),
    /provides components\/assistant-ui\/tool\.config\.tsx/,
  );
});

test("install validation resolves an alias asset import behind a query suffix", () => {
  const importer = {
    path: "components/assistant-ui/thread.tsx",
    content: 'import logoUrl from "@/components/assistant-ui/logo.svg?url";\n',
  };

  assert.equal(
    findingsFrom([
      componentItem([
        importer,
        { path: "components/assistant-ui/logo.svg", content: "<svg />\n" },
      ]),
    ]),
    null,
  );

  assert.match(
    findingsFrom([componentItem([importer])]),
    /provides components\/assistant-ui\/logo\.svg/,
  );
});

test("install validation resolves direct dependencies through any local alias target", () => {
  for (const [specifier, providedPath] of [
    ["@/lib/feature", "lib/feature.ts"],
    ["@/server/config.js", "server/config.ts"],
    ["@/data/client", "data/client/index.ts"],
    ["@/assets/logo.svg?url", "assets/logo.svg"],
  ]) {
    const dependency = "https://r.assistant-ui.com/provider.json";
    const findings = findingsFrom([
      componentItem(
        [
          {
            path: "components/assistant-ui/demo.tsx",
            content: `import value from "${specifier}";\n`,
          },
        ],
        { registryDependencies: [dependency] },
      ),
      {
        name: "provider",
        type: "registry:lib",
        files: [
          {
            path: `source/${providedPath}`,
            target: providedPath,
            content: "export default true;\n",
          },
        ],
      },
    ]);

    assert.equal(findings, null, `${specifier} resolves to ${providedPath}`);
  }
});

test("install validation rejects an unresolved non-ambient local alias", () => {
  const findings = findingsFrom([
    componentItem([
      {
        path: "components/assistant-ui/demo.tsx",
        content: 'import value from "@/lib/feature";\n',
      },
    ]),
  ]);

  assert.match(findings, /imports "@\/lib\/feature"/);
  assert.match(findings, /provides lib\/feature\.tsx or lib\/feature\.ts/);
});

test("install validation allows the ambient lib/utils alias", () => {
  assert.equal(
    findingsFrom([
      componentItem([
        {
          path: "components/assistant-ui/demo.tsx",
          content: 'import { cn } from "@/lib/utils";\n',
        },
      ]),
    ]),
    null,
  );
});

test("install validation resolves a sibling against the registryDependency install path", () => {
  // A shadcn registryDependency installs to components/ui/<name>.tsx, so it
  // satisfies a sibling import only from inside that directory.
  const importing = (path) =>
    componentItem([{ path, content: 'import { Badge } from "./badge";\n' }], {
      registryDependencies: ["badge"],
    });

  assert.equal(findingsFrom([importing("components/ui/menu.tsx")]), null);

  assert.match(
    findingsFrom([importing("components/assistant-ui/thread.tsx")]),
    /imports "\.\/badge", but no file or registryDependency provides/,
  );
});

test("cli scanner element mapping names a real registry item for every element file", async () => {
  const { registry } = await import("../src/registry.ts");

  const cliSource = await readFile(
    new URL("../../../packages/cli/src/lib/create-project.ts", import.meta.url),
    "utf8",
  );
  const setMatch = cliSource.match(
    /BARE_ELEMENT_ITEMS = new Set\(\[([^\]]*)\]/,
  );
  assert.ok(setMatch, "BARE_ELEMENT_ITEMS not found in create-project.ts");
  const cliBare = new Set(
    [...setMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]),
  );

  const itemNames = new Set(registry.map((item) => item.name));
  for (const name of cliBare) {
    assert.ok(
      itemNames.has(name),
      `BARE_ELEMENT_ITEMS entry "${name}" is not a registry item`,
    );
  }

  const expectedItems = new Set(
    registry.flatMap((item) =>
      (item.files ?? []).flatMap((file) => {
        const match = file.sourcePath?.match(
          /react\/assistant-ui\/elements\/([a-z0-9-]+)(\.aui(?:\.radix)?)?\.tsx$/,
        );
        if (!match) return [];
        const base = match[1];
        if (match[2]) return [base];
        return [cliBare.has(base) ? base : `elements-${base}`];
      }),
    ),
  );
  for (const expected of expectedItems) {
    assert.ok(
      itemNames.has(expected),
      `the scanner maps a shipped element file to "${expected}", which is not a registry item`,
    );
  }
});

test("install validation rejects a stale shadcn UI registry dependency", () => {
  const findings = findingsFrom([
    componentItem(
      [
        {
          path: "components/assistant-ui/demo.tsx",
          content: "export const Demo = () => null;\n",
        },
      ],
      { registryDependencies: ["button"] },
    ),
  ]);

  assert.match(
    findings,
    /demo: registry dependency "button" is not imported directly by this item/,
  );
});

test("install validation recognizes a shadcn UI dependency used through an alias", () => {
  const findings = findingsFrom([
    componentItem(
      [
        {
          path: "components/assistant-ui/demo.tsx",
          content: 'import { Button } from "@/components/ui/button";\n',
        },
      ],
      { registryDependencies: ["button"] },
    ),
  ]);

  assert.equal(findings, null);
});

test("install validation recognizes a direct assistant URL used through an alias", () => {
  const findings = findingsFrom([
    componentItem(
      [
        {
          path: "components/assistant-ui/demo.tsx",
          content: 'import { Badge } from "@/components/assistant-ui/badge";\n',
        },
      ],
      {
        registryDependencies: ["https://r.assistant-ui.com/badge.json"],
      },
    ),
    {
      name: "badge",
      type: "registry:component",
      files: [
        {
          path: "components/assistant-ui/badge.tsx",
          content: "export const Badge = () => null;\n",
        },
      ],
    },
  ]);

  assert.equal(findings, null);
});

test("install validation recognizes a direct assistant dependency through relative imports and targets", () => {
  const findings = findingsFrom([
    componentItem(
      [
        {
          path: "packages/ui/src/components/thread.tsx",
          target: "components/assistant-ui/thread.tsx",
          content: 'import { Badge } from "./badge";\n',
        },
      ],
      {
        registryDependencies: ["https://r.assistant-ui.com/badge.json"],
      },
    ),
    {
      name: "badge",
      type: "registry:component",
      files: [
        {
          path: "packages/ui/src/components/badge.tsx",
          target: "components/assistant-ui/badge.tsx",
          content: "export const Badge = () => null;\n",
        },
      ],
    },
  ]);

  assert.equal(findings, null);
});

test("install validation does not count a transitive install as direct dependency usage", () => {
  const findings = findingsFrom([
    componentItem(
      [
        {
          path: "components/assistant-ui/demo.tsx",
          content: 'import { Badge } from "@/components/assistant-ui/badge";\n',
        },
      ],
      {
        registryDependencies: ["https://r.assistant-ui.com/thread.json"],
      },
    ),
    {
      name: "thread",
      type: "registry:component",
      files: [
        {
          path: "components/assistant-ui/thread.tsx",
          content: 'import { Badge } from "@/components/assistant-ui/badge";\n',
        },
      ],
      registryDependencies: ["https://r.assistant-ui.com/badge.json"],
    },
    {
      name: "badge",
      type: "registry:component",
      files: [
        {
          path: "components/assistant-ui/badge.tsx",
          content: "export const Badge = () => null;\n",
        },
      ],
    },
  ]);

  assert.match(
    findings,
    /demo: registry dependency "https:\/\/r\.assistant-ui\.com\/thread\.json" is not imported directly by this item/,
  );
});

test("install validation accepts an explicitly documented non-imported style dependency", () => {
  const style = {
    name: "generative-ui-style",
    type: "registry:style",
  };
  const item = {
    ...componentItem([], {
      registryDependencies: [
        "https://r.assistant-ui.com/generative-ui-style.json",
      ],
      registryDependencyUsageExemptions: {
        "https://r.assistant-ui.com/generative-ui-style.json":
          "Installs CSS variables and vocabulary rules consumed through class names.",
      },
    }),
    name: "generative-ui",
  };

  assert.equal(
    findingsFrom(
      [item, style],
      createRegistryDependencyUsageExemptions([item, style], "radix"),
    ),
    null,
  );

  assert.match(
    findingsFrom([
      componentItem([], {
        registryDependencies: [
          "https://r.assistant-ui.com/generative-ui-style.json",
        ],
      }),
      style,
    ]),
    /demo: registry dependency "https:\/\/r\.assistant-ui\.com\/generative-ui-style\.json" is not imported directly by this item/,
  );
});

test("install validation accepts an explicitly documented page sidecar", () => {
  const backend = {
    name: "backend",
    type: "registry:page",
    files: [
      {
        path: "app/api/chat/route.ts",
        content: "export const POST = () => null;\n",
      },
    ],
  };
  const quickStart = {
    name: "quick-start",
    type: "registry:page",
    registryDependencies: ["https://r.assistant-ui.com/backend.json"],
    registryDependencyUsageExemptions: {
      "https://r.assistant-ui.com/backend.json":
        "Installs the API route used by the page without importing it into the client bundle.",
    },
  };

  assert.equal(
    findingsFrom(
      [quickStart, backend],
      createRegistryDependencyUsageExemptions([quickStart, backend], "radix"),
    ),
    null,
  );

  assert.match(
    findingsFrom([
      componentItem([], {
        registryDependencies: ["https://r.assistant-ui.com/backend.json"],
      }),
      backend,
    ]),
    /demo: registry dependency "https:\/\/r\.assistant-ui\.com\/backend\.json" is not imported directly by this item/,
  );

  assert.match(
    findingsFrom([
      {
        name: "quick-start",
        type: "registry:page",
        registryDependencies: ["https://r.assistant-ui.com/thread.json"],
      },
      {
        name: "thread",
        type: "registry:component",
        files: [
          {
            path: "components/assistant-ui/thread.tsx",
            content: "export const Thread = () => null;\n",
          },
        ],
      },
    ]),
    /quick-start: registry dependency "https:\/\/r\.assistant-ui\.com\/thread\.json" is not imported directly by this item/,
  );
});

test("install validation requires foreign registry URLs to be explicitly documented", () => {
  const item = componentItem([], {
    registryDependencies: ["https://example.com/foreign.json"],
    registryDependencyUsageExemptions: {
      "https://example.com/foreign.json":
        "Installs metadata whose foreign payload is unavailable to this build.",
    },
  });

  assert.equal(
    findingsFrom(
      [item],
      createRegistryDependencyUsageExemptions([item], "radix"),
    ),
    null,
  );

  assert.match(
    findingsFrom([
      componentItem([], {
        registryDependencies: ["https://example.com/foreign.json"],
      }),
    ]),
    /foreign\.json" is not imported directly by this item/,
  );
});

test("registry dependency usage exemptions reject misspelled dependencies", () => {
  const item = componentItem([], {
    registryDependencies: ["button"],
    registryDependencyUsageExemptions: {
      buton: "Installs a component used outside this item's module graph.",
    },
  });

  assert.throws(
    () => createRegistryDependencyUsageExemptions([item], "radix"),
    /demo: registryDependencyUsageExemptions entry "buton" does not match a declared registry dependency/,
  );
});

test("registry dependency usage exemptions reject stale entries", () => {
  const item = componentItem([], {
    registryDependencies: [],
    registryDependencyUsageExemptions: {
      button: "Installs a component used outside this item's module graph.",
    },
  });

  assert.throws(
    () => createRegistryDependencyUsageExemptions([item], "base"),
    /demo: registryDependencyUsageExemptions entry "button" does not match a declared registry dependency/,
  );
});

test("registry dependency usage exemptions require a reviewable reason", async () => {
  const item = componentItem([], {
    registryDependencies: ["button"],
    registryDependencyUsageExemptions: { button: "   " },
  });

  await assert.rejects(
    () => buildRegistry([item], []),
    /Invalid registry metadata:[\s\S]*registryDependencyUsageExemptions\.button/,
  );
});

test("registry dependency usage exemptions do not hide missing local items", () => {
  const dependency = "https://r.assistant-ui.com/missing.json";
  const item = componentItem([], {
    registryDependencies: [dependency],
    registryDependencyUsageExemptions: {
      [dependency]: "Installs runtime-selected metadata.",
    },
  });

  const findings = findingsFrom(
    [item],
    createRegistryDependencyUsageExemptions([item], "radix"),
  );
  assert.match(findings, /does not match a local registry item/);
});

test("registry dependency usage exemptions reject directly imported dependencies", () => {
  const item = componentItem(
    [
      {
        path: "components/assistant-ui/demo.tsx",
        content: 'import { Button } from "@/components/ui/button";\n',
      },
    ],
    {
      registryDependencies: ["button"],
      registryDependencyUsageExemptions: {
        button: "Installs a component selected at runtime.",
      },
    },
  );

  const findings = findingsFrom(
    [item],
    createRegistryDependencyUsageExemptions([item], "radix"),
  );
  assert.match(
    findings,
    /registryDependencyUsageExemptions entry "button" is unnecessary because the dependency is imported directly/,
  );
});

test("registry dependency usage exemptions include only the active flavor", () => {
  const commonDependency = "https://r.assistant-ui.com/theme.json";
  const item = componentItem([], {
    registryDependencies: [commonDependency],
    radixRegistryDependencies: ["input"],
    baseRegistryDependencies: ["popover"],
    registryDependencyUsageExemptions: {
      [commonDependency]: "Installs shared theme metadata.",
      input: "Installs the Radix input for runtime composition.",
      popover: "Installs the Base popover for runtime composition.",
    },
  });

  const radixExemptions = createRegistryDependencyUsageExemptions(
    [item],
    "radix",
  ).get("demo");
  const baseExemptions = createRegistryDependencyUsageExemptions(
    [item],
    "base",
  ).get("demo");

  assert.deepEqual([...radixExemptions], [commonDependency, "input"]);
  assert.deepEqual(
    [...baseExemptions],
    ["https://r.assistant-ui.com/base/theme.json", "popover"],
  );
});

test("internal usage exemptions do not leak into Vue payloads or indexes", async () => {
  const dependency = "https://example.com/theme.json";
  const vueItem = {
    name: "vue-theme",
    type: "registry:style",
    registryDependencies: [dependency],
    registryDependencyUsageExemptions: {
      [dependency]: "Installs foreign theme metadata.",
    },
  };

  await buildRegistry([], [vueItem]);

  for (const outputPath of [
    "dist/vue/registry.json",
    "dist/vue/vue-theme.json",
  ]) {
    const output = await readFile(outputPath, "utf8");
    assert.equal(
      output.includes("registryDependencyUsageExemptions"),
      false,
      `${outputPath} excludes internal validation metadata`,
    );
  }
});

test("the real registry build satisfies the emitted install metadata contract", async () => {
  const { registry, vueRegistry } = await import("../src/registry.ts");

  await assert.doesNotReject(() => buildRegistry(registry, vueRegistry));

  for (const outputPath of [
    "dist/registry.json",
    "dist/base/registry.json",
    "dist/generative-ui.json",
    "dist/base/generative-ui.json",
  ]) {
    const output = await readFile(outputPath, "utf8");
    assert.equal(
      output.includes("registryDependencyUsageExemptions"),
      false,
      `${outputPath} excludes internal validation metadata`,
    );
  }
});

test("emitted files carry a repo-root sourcePath for source links", () => {
  const kit = createRegistryPayload({
    name: "sourcepath-kit",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/thread.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx",
      },
    ],
  });
  assert.equal(
    kit.payload.files[0].sourcePath,
    "packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx",
  );

  const radix = createRegistryPayload(
    {
      name: "sourcepath-radix",
      type: "registry:component",
      files: [
        {
          type: "registry:component",
          path: "components/assistant-ui/elements/threadlist-sidebar.aui.tsx",
          sourcePath:
            "../../packages/ui/src/components/react/assistant-ui/elements/threadlist-sidebar.aui.tsx",
        },
      ],
    },
    true,
  );
  assert.equal(
    radix.payload.files[0].sourcePath,
    "packages/ui/src/components/react/assistant-ui/elements/threadlist-sidebar.aui.radix.tsx",
  );

  const template = createRegistryPayload({
    name: "sourcepath-template",
    type: "registry:page",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        sourcePath: "templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
    ],
  });
  assert.equal(
    template.payload.files[0].sourcePath,
    "apps/registry/templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
  );
});

test("every emitted sourcePath exists at the repo root", async () => {
  const { existsSync, readFileSync, readdirSync } = await import("node:fs");
  const { join, resolve } = await import("node:path");

  // Build inside the test so it neither ENOENTs in isolation nor validates a
  // stale dist from an earlier run.
  const { registry, stagedVueRegistry } = await import("../src/registry.ts");
  await buildRegistry(registry, stagedVueRegistry);

  const repoRoot = resolve(process.cwd(), "../..");
  const jsonPaths = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "files") continue;
        walk(full);
      } else if (entry.name.endsWith(".json")) {
        jsonPaths.push(full);
      }
    }
  };
  walk("dist");

  assert.ok(
    jsonPaths.length > 50,
    `unexpectedly few items: ${jsonPaths.length}`,
  );

  const missing = [];
  for (const jsonPath of jsonPaths) {
    let item;
    try {
      item = JSON.parse(readFileSync(jsonPath, "utf8"));
    } catch {
      continue;
    }
    if (!item || typeof item !== "object" || !Array.isArray(item.files)) {
      continue;
    }
    for (const file of item.files) {
      if (typeof file.sourcePath !== "string") {
        missing.push(`${jsonPath}: ${file.path} has no sourcePath`);
      } else if (!existsSync(join(repoRoot, file.sourcePath))) {
        missing.push(`${jsonPath}: ${file.sourcePath}`);
      }
    }
  }
  assert.deepEqual(missing, [], `emitted sourcePaths missing from the repo`);
});

test("packaged file contents are written per item at the install target", async () => {
  const { mkdtemp, readFile: readTmp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  const root = await mkdtemp(join(tmpdir(), "aui-registry-files-"));
  try {
    await writePackagedFiles(root, [
      {
        name: "alpha",
        type: "registry:page",
        files: [
          {
            type: "registry:page",
            path: "app/api/chat/route.ts",
            content: "alpha content",
          },
        ],
      },
      {
        name: "beta",
        type: "registry:page",
        files: [
          {
            type: "registry:page",
            path: "app/api/chat/route.ts",
            content: "beta content",
          },
        ],
      },
      {
        name: "gamma",
        type: "registry:page",
        files: [
          {
            type: "registry:page",
            path: "app/ai-sdk/assistant.tsx",
            target: "app/assistant.tsx",
            content: "gamma content",
          },
        ],
      },
      {
        name: "chat/b/delta",
        type: "registry:page",
        files: [
          {
            type: "registry:page",
            path: "app/api/chat/resume/[streamId]/route.ts",
            content: "delta content",
          },
        ],
      },
    ]);

    assert.equal(
      await readTmp(join(root, "files/alpha/app/api/chat/route.ts"), "utf8"),
      "alpha content",
    );
    assert.equal(
      await readTmp(join(root, "files/beta/app/api/chat/route.ts"), "utf8"),
      "beta content",
    );
    // Keyed on target ?? path: the location shadcn installs to, which is the
    // path the docs' packaged-file URLs and curl -o both use.
    assert.equal(
      await readTmp(join(root, "files/gamma/app/assistant.tsx"), "utf8"),
      "gamma content",
    );
    // A slash-bearing item name nests as directories, and a bracketed route
    // segment is preserved verbatim on disk — the URL side percent-encodes it.
    assert.equal(
      await readTmp(
        join(
          root,
          "files/chat/b/delta/app/api/chat/resume/[streamId]/route.ts",
        ),
        "utf8",
      ),
      "delta content",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the built dist serves every packaged file at the docs' URL convention", async () => {
  const { readFile: readJson, readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");

  // Build inside the test so it neither ENOENTs in isolation nor validates a
  // stale dist from an earlier run.
  const { registry, stagedVueRegistry } = await import("../src/registry.ts");
  await buildRegistry(registry, stagedVueRegistry);

  // The consumer half of the convention. Both sides derive the same key
  // independently, so the docs' own builder runs against the real dist here
  // rather than against fixtures that could agree with neither.
  const { buildDownloadCommand, packagedFileUrl } =
    await import("../../docs/components/pages/docs/fumadocs/install/packaged-file-url.ts");

  // Item names may contain slashes, so the walk is recursive. files/ holds the
  // packaged bytes themselves, base/ is walked as its own root, and vue/ is a
  // staged flavor the docs' packaged-file URLs do not serve.
  const collectItemJsons = async (dir, out) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (
          entry.name === "files" ||
          entry.name === "base" ||
          entry.name === "vue"
        ) {
          continue;
        }
        await collectItemJsons(join(dir, entry.name), out);
      } else if (entry.name.endsWith(".json")) {
        out.push(join(dir, entry.name));
      }
    }
  };

  for (const [distRoot, flavor, origin] of [
    ["dist", "radix", "https://r.assistant-ui.com/files/"],
    ["dist/base", "base", "https://r.assistant-ui.com/base/files/"],
  ]) {
    const jsonPaths = [];
    await collectItemJsons(distRoot, jsonPaths);
    for (const jsonPath of jsonPaths) {
      let item;
      try {
        item = JSON.parse(await readJson(jsonPath, "utf8"));
      } catch {
        continue;
      }
      if (!item || typeof item !== "object" || !Array.isArray(item.files)) {
        continue;
      }
      for (const file of item.files) {
        const url = packagedFileUrl(flavor, {
          name: item.name,
          path: file.target ?? file.path,
        });
        assert.equal(url.slice(0, origin.length), origin);
        const served = await readJson(
          join(
            distRoot,
            "files",
            url
              .slice(origin.length)
              .split("/")
              .map(decodeURIComponent)
              .join("/"),
          ),
          "utf8",
        );
        assert.equal(served, file.content);
      }
    }
  }

  const resumable = JSON.parse(
    await readJson("dist/ai-sdk-backend-resumable.json", "utf8"),
  );
  const bracketed = resumable.files.find((file) =>
    (file.target ?? file.path).includes("[streamId]"),
  );
  assert.equal(
    buildDownloadCommand(
      [{ name: resumable.name, path: bracketed.target ?? bracketed.path }],
      "radix",
    ),
    "curl -fsSL --create-dirs \\\n  -o 'app/api/chat/resume/[streamId]/route.ts' https://r.assistant-ui.com/files/ai-sdk-backend-resumable/app/api/chat/resume/%5BstreamId%5D/route.ts",
  );
});
