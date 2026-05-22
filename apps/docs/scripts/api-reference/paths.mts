import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

export const DOCS_ROOT = path.join(REPO_ROOT, "apps/docs");

export const REACT_PKG = path.join(REPO_ROOT, "packages/react/src");
export const CORE_PKG = path.join(REPO_ROOT, "packages/core/src");
export const PRIMITIVES_DIR = path.join(REACT_PKG, "primitives");
export const REACT_INDEX = path.join(REACT_PKG, "index.ts");

export const TYPE_DOCS_INPUT = path.join(
  DOCS_ROOT,
  "content/types-to-generate/typeDocs.ts",
);
export const TYPE_DOCS_OUTPUT = path.join(DOCS_ROOT, "generated/typeDocs.ts");
export const INTEGRATION_TYPE_DOCS_OUTPUT = path.join(
  DOCS_ROOT,
  "generated/integrationTypeDocs.ts",
);
export const PRIMITIVE_DOCS_OUTPUT = path.join(
  DOCS_ROOT,
  "generated/primitiveDocs.ts",
);

export const API_REFERENCE_DIR = path.join(
  DOCS_ROOT,
  "content/docs/(reference)/api-reference",
);

export const INTEGRATION_PACKAGES = [
  {
    slug: "react-ai-sdk",
    packageName: "@assistant-ui/react-ai-sdk",
    entry: path.join(REPO_ROOT, "packages/react-ai-sdk/src/index.ts"),
  },
  {
    slug: "cloud-ai-sdk",
    packageName: "@assistant-ui/cloud-ai-sdk",
    entry: path.join(REPO_ROOT, "packages/cloud-ai-sdk/src/index.ts"),
  },
] as const;
