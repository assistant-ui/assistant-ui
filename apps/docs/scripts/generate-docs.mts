import { discoverExports } from "./api-reference/discover.mts";
import {
  printClassificationDiagnostics,
  writeApiReferencePages,
} from "./api-reference/render.mts";
import {
  buildTypeDocs,
  writeIntegrationTypeDocs,
  writeTypeDocs,
} from "./api-reference/type-docs.mts";

console.log("Discovering @assistant-ui/react exports...");
const exports = discoverExports();

printClassificationDiagnostics(exports);

// Primitive parts are extracted lazily inside buildTypeDocs (interleaved with
// per-export shape extraction) so ts-morph resolves intersection property
// iteration in the same order as legacy api-surface.
const { typeDocs, integrationTypeDocs, integrationsByPackage } =
  buildTypeDocs(exports);

writeTypeDocs(typeDocs);
writeIntegrationTypeDocs(integrationTypeDocs);
writeApiReferencePages(exports, typeDocs, integrationsByPackage);

console.log(`Generated type docs for ${typeDocs.size} exports`);
console.log(
  `Generated React API reference pages for ${exports.length} exports`,
);
