import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it.each([
  "assistant-ui-cloud-harness-b9d8b56ad.json",
  "assistant-ui-wizard-login-ea9aae48e.json",
])("serves the CLI preview recorded in %s", (filename) => {
  const downloads = new URL("../../public/downloads/", import.meta.url);
  const manifest = JSON.parse(
    readFileSync(new URL(filename, downloads), "utf8"),
  );
  const artifact = readFileSync(new URL(manifest.artifact, downloads));
  expect(createHash("sha256").update(artifact).digest("hex")).toBe(
    manifest.sha256,
  );
});
