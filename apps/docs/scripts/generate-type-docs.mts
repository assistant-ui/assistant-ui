// Build-only inputs (gitignored under apps/docs/generated/): type docs,
// integration type docs, and primitive docs. Runs in one process so the
// type-docs and primitive-docs generators share a ts-morph Project and the
// `_partsCache` in primitive-extract.mts. The committed api-reference MDX is
// generated separately by generate-api-reference.mts (CI only).
import { discoverExports } from "./generated-docs/discover.mts";
import {
  buildTypeDocs,
  writeIntegrationTypeDocs,
  writeTypeDocs,
} from "./generated-docs/type-docs.mts";
import { generatePrimitiveDocs } from "./generated-docs/primitive-docs.mts";

console.log("Discovering @assistant-ui/react exports...");
const exports = discoverExports();
const { typeDocs, integrationTypeDocs } = buildTypeDocs(exports);

writeTypeDocs(typeDocs);
writeIntegrationTypeDocs(integrationTypeDocs);
console.log(`Generated type docs for ${typeDocs.size} exports`);

generatePrimitiveDocs();
