import { snapshotDocs } from "./docs.ts";

// `node src/suites/agent-docs/snapshot.ts <base-url> <dir>`: save the AI docs once, before trials run in parallel.
const [base = "https://www.assistant-ui.com", dir] = process.argv.slice(2);
if (!dir) throw new Error("Usage: snapshot.ts <base-url> <dir>");
const { saved, failed } = await snapshotDocs(base, dir);
console.log(`Saved ${saved} pages to ${dir}; ${failed.length} failed.`);
for (const url of failed) console.log(`  failed: ${url}`);
