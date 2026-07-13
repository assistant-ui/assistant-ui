import { discoverExports } from "./generated-docs/discover.mts";
import {
  printClassificationDiagnostics,
  writeApiReferencePages,
} from "./generated-docs/render.mts";
import { buildTypeDocs } from "./generated-docs/type-docs.mts";

// Generates the committed api-reference MDX pages. Run on demand (CI), never on
// dev/build. The gitignored type-doc inputs these pages import are generated
// separately by generate-type-docs.mts.
console.log("Discovering assistant-ui API exports...");
const exports = discoverExports();
const { typeDocs, integrationsByPackage } = buildTypeDocs(exports);

printClassificationDiagnostics(exports, typeDocs);

writeApiReferencePages(exports, typeDocs, integrationsByPackage);
console.log(`Generated API reference pages for ${exports.length} exports`);
