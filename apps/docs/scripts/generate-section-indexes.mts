import { readFileSync, writeFileSync } from "node:fs";
import {
  GENERATED_SECTION_INDEXES,
  sectionIndexFile,
  sectionIndexGroups,
  syncSectionIndex,
} from "../lib/section-index.ts";

for (const section of GENERATED_SECTION_INDEXES) {
  const file = sectionIndexFile(section);
  const source = readFileSync(file, "utf8");
  const next = syncSectionIndex(source, sectionIndexGroups(section));
  if (next !== source) {
    writeFileSync(file, next);
    console.log(`updated ${section}/index.mdx`);
  }
}
