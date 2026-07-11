import assert from "node:assert/strict";
import test from "node:test";
import "tsx/esm";

const {
  createBaseRegistryItem,
  createRadixRegistryItem,
  getBaseVariantSourcePath,
  validateBaseVariantContent,
  validateRadixPassDidNotReadBaseSources,
  validateStyleScopedDependencies,
  validateVariantExportParity,
  validateVariantSlotParity,
  validateVariantTreesDiffer,
} = await import("./build-registry.ts");

const createBuilt = (
  name,
  files,
  { readPaths = [], baseVariantOutputPaths, sourceContentsByOutputPath } = {},
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
  sourceContentsByOutputPath:
    sourceContentsByOutputPath ??
    new Map(files.map(([filePath, content]) => [filePath, content])),
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

test("base variant content validation reports plain and scoped radix imports", () => {
  assert.throws(
    () =>
      validateBaseVariantContent([
        createBuilt("plain", [
          ["components/plain.tsx", 'import { Tooltip } from "radix-ui";'],
        ]),
      ]),
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
      validateBaseVariantContent([
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
          "- scoped: base variant for components/scoped.tsx contains forbidden radix import",
        ),
      );
      return true;
    },
  );

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

test("variant tree validation aggregates identical radix and base sources", () => {
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
          "- first: radix and base sources for components/first.tsx are identical despite a .base.tsx variant",
        ),
      );
      assert.ok(
        error.message.includes(
          "- second: radix and base sources for components/second.tsx are identical despite a .base.tsx variant",
        ),
      );
      return true;
    },
  );
});

test("variant tree validation accepts identical emitted content when sources differ", () => {
  const radixBuilt = [
    createBuilt("widget", [["components/widget.tsx", "shared emitted"]], {
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

test("slot parity reports mismatched data-slot attributes", () => {
  const radixBuilt = [
    createBuilt("button", [
      [
        "components/button.tsx",
        '<button data-slot="button" data-slot="button-icon" />',
      ],
    ]),
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

test("slot parity accepts identical slot sets and skips empty base variants", () => {
  assert.doesNotThrow(() =>
    validateVariantSlotParity(
      [
        createBuilt("button", [
          ["components/button.tsx", '<button data-slot="button" />'],
        ]),
        createBuilt("plain", [["components/plain.tsx", "export const x = 1;"]]),
      ],
      [
        createBuilt("button", [
          ["components/button.tsx", '<div data-slot="button" />'],
        ]),
        createBuilt(
          "plain",
          [["components/plain.tsx", "export const y = 2;"]],
          {
            baseVariantOutputPaths: [],
          },
        ),
      ],
    ),
  );
});

test("slot parity counts object-prop slots the same as jsx-attribute slots", () => {
  assert.doesNotThrow(() =>
    validateVariantSlotParity(
      [
        createBuilt("badge", [
          ["components/badge.tsx", '<span data-slot="badge" />'],
        ]),
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
    createBuilt("widget", [
      [
        "components/widget.tsx",
        "export function Widget() {}\nexport function Helper() {}",
      ],
    ]),
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
          createBuilt("alias", [
            ["components/alias.tsx", "const A = 1;\nexport { A as B };"],
          ]),
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
        createBuilt("same", [
          [
            "components/same.tsx",
            "export function Same() {}\nconst A = 1;\nexport { A as B };",
          ],
        ]),
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
          createBuilt("widget", [
            ["components/widget.tsx", "export default function Widget() {}"],
          ]),
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
        createBuilt("widget", [
          ["components/widget.tsx", "export default function RadixWidget() {}"],
        ]),
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
          createBuilt("widget", [
            [
              "components/widget.tsx",
              'export function Widget() {}\nexport * from "./extra";',
            ],
          ]),
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
          createBuilt("widget", [
            [
              "components/widget.tsx",
              'export * as Helpers from "./extra";\nexport function Widget() {}',
            ],
          ]),
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
