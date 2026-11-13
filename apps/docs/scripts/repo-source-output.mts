import { cpSync, existsSync } from "node:fs";
import path from "node:path";

// Read through process.cwd() at request time, which the bundler cannot follow.
const RUNTIME_FILES = [
  "generated/.repo-source",
  "assets",
  "content/design.md",
  "components/diagrammatic/examples",
  "components/demo/elements",
];

/** Copies the files server code reads from disk into the Vercel function, whose root is its working directory. */
export const shipRepoSource = {
  name: "docs:ship-runtime-files",
  afterNitroBuild: ({
    root,
    preset,
    outputDir,
  }: {
    root: string;
    preset: string;
    outputDir: string;
  }) => {
    if (!preset.startsWith("vercel")) return;
    // Farm moves server/ into the function directory after this hook.
    const functionRoot = path.join(outputDir, "server");
    for (const file of RUNTIME_FILES) {
      const source = path.join(root, file);
      if (!existsSync(source))
        throw new Error(
          `${file} is missing. Run \`pnpm generate:source-snapshot\` before \`farm build\`.`,
        );
      cpSync(source, path.join(functionRoot, file), { recursive: true });
    }
  },
};
