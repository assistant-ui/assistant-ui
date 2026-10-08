import type { EvalCase } from "../types.ts";

/**
 * Covers the package rule that a host-owned SDK used by an optional adapter is
 * an optional peer with a wide floor and an exact development pin.
 */
export const optionalHostSdkDependency: EvalCase = {
  id: "optional-host-sdk-dependency",
  description: "packaging an optional host SDK without forcing it on consumers",
  seed: [
    {
      path: "package.json",
      content: `${JSON.stringify(
        {
          name: "@example/lexical-adapter",
          version: "1.0.0",
          type: "module",
          dependencies: { "@assistant-ui/core": "^1.0.0" },
          devDependencies: {},
        },
        null,
        2,
      )}\n`,
    },
    {
      path: "src/index.ts",
      content: `export const adapterName = "lexical";\n`,
    },
  ],
  task: [
    "Add src/lexical.ts exporting an isLexicalEditor(value) type guard that",
    "uses the LexicalEditor type from `lexical`. Update package.json so the",
    "adapter can be developed against lexical 0.38.2 and published for apps",
    "that opt into the integration.",
  ].join("\n"),
  rubric: [
    "Judge the dependency placement for the optional Lexical integration.",
    "PASS only if package.json has an exact lexical 0.38.2 devDependency, a",
    "lexical peerDependency with a non-exact compatible floor no higher than",
    "0.38.2, peerDependenciesMeta.lexical.optional set to true, and no lexical",
    "entry in dependencies. Also require src/lexical.ts to exist and import the",
    "LexicalEditor type. FAIL if any packaging condition is missing.",
  ].join("\n"),
  inspect: ["package.json", "src/lexical.ts"],
};
