import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloudHarnessTemplate,
  isCloudHarnessTemplateEntry,
} from "../../../scripts/lib/cloud-harness-template.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "../..", cloudHarnessTemplate);
const target = path.join(root, cloudHarnessTemplate);
if (!existsSync(source))
  throw new Error(`Cloud harness template is missing: ${source}`);
mkdirSync(path.dirname(target), { recursive: true });
const temporary = mkdtempSync(
  path.join(path.dirname(target), "cloud-harness-"),
);
try {
  cpSync(source, temporary, {
    recursive: true,
    filter: (file) => isCloudHarnessTemplateEntry(path.basename(file)),
  });
  rmSync(target, { recursive: true, force: true });
  renameSync(temporary, target);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
