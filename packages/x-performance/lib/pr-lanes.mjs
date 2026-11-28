import { readFileSync } from "node:fs";
import { isExcludedPackageTest } from "../../../scripts/lib/package-test-inputs.mjs";
import { REF_PACKAGE_DIRS } from "./ref-packages.mjs";

const paths = readFileSync(0, "utf8").split("\0");
const measured = Object.values(REF_PACKAGE_DIRS);
const workflow = paths.includes(".github/workflows/perf.yaml");
const bench =
  workflow ||
  paths.some(
    (file) =>
      file.startsWith("packages/x-performance/") ||
      file === "scripts/lib/package-test-inputs.mjs" ||
      (measured.some((dir) => file.startsWith(`${dir}/`)) &&
        !isExcludedPackageTest(file)),
  );
const trace =
  workflow ||
  paths.some(
    (file) =>
      file.startsWith("packages/tw-shimmer/") ||
      file.startsWith("packages/x-performance/fixtures/") ||
      file.startsWith("packages/x-performance/lib/trace"),
  );

console.log(`bench=${bench}\ntrace=${trace}`);
