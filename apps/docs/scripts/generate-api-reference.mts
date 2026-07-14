import { discoverExports } from "./generated-docs/discover.mts";
import {
  printClassificationDiagnostics,
  writeApiReferencePages,
} from "./generated-docs/render.mts";
import { buildTypeDocs } from "./generated-docs/type-docs.mts";

const strict = process.argv.includes("--strict");

// Generates the committed api-reference MDX pages. Run on demand (CI), never on
// dev/build. The gitignored type-doc inputs these pages import are generated
// separately by generate-type-docs.mts.
console.log("Discovering assistant-ui API exports...");
const exports = discoverExports();
const { typeDocs, integrationsByPackage } = buildTypeDocs(exports);

printClassificationDiagnostics(exports, typeDocs);

const { unmanagedStalePages } = writeApiReferencePages(
  exports,
  typeDocs,
  integrationsByPackage,
);
console.log(`Generated API reference pages for ${exports.length} exports`);

if (strict && unmanagedStalePages.length > 0) {
  console.error(
    `Strict mode: ${unmanagedStalePages.length} unmanaged stale page(s) found.`,
  );
  process.exit(1);
}
