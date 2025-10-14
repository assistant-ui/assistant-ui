import { createGenerator } from "fumadocs-typescript";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Point to monorepo root (go up from apps/docs/lib to monorepo root)
const baseGenerator = createGenerator({
  basePath: resolve(__dirname, "../../.."),
});

const isValidIdentifier = (name: string) => /^[A-Za-z_$][\w$]*$/.test(name);

export const generator = {
  ...baseGenerator,
  async generateTypeTable(props, options) {
    const docs = await baseGenerator.generateTypeTable(props, options);
    return docs.map((doc) => ({
      ...doc,
      entries: doc.entries.filter((entry) => isValidIdentifier(entry.name)),
    }));
  },
};
