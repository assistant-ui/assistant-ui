import assert from "node:assert/strict";
import test from "node:test";
import "tsx/esm";

const {
  collectAttributeSelectorValues,
  createBaseRegistryItem,
  createRadixRegistryItem,
  getRadixVariantSourcePath,
  validateBasePassDidNotReadRadixSources,
  validateBaseTreeRadixImports,
  validateBaseVariantContent,
  validateEmittedSpecifierHygiene,
  validateStyleScopedDependencies,
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
