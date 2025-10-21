import { createGenerator } from "fumadocs-typescript";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { applyAssistantUITransform } from "./assistant-ui-transform";

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Point to monorepo root (go up from apps/docs/lib to monorepo root)
const baseGenerator = createGenerator({
  basePath: resolve(__dirname, "../../.."),
});

export const generator = {
  ...baseGenerator,
  generateDocumentation(file, name, options) {
    return baseGenerator.generateDocumentation(
      file,
      name,
      applyAssistantUITransform(options),
    );
  },
  generateTypeTable(props, options) {
    return baseGenerator.generateTypeTable(
      props,
      applyAssistantUITransform(options),
    );
  },
};
