import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { transcriptSchema } from "../transcript/schema";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "../../schema/transcript.schema.json");

describe("transcript schema sync", () => {
  it("schema.ts mirrors schema/transcript.schema.json byte-for-byte after JSON normalization", () => {
    const fileContents = readFileSync(schemaPath, "utf-8");
    const fromFile = JSON.parse(fileContents);
    expect(transcriptSchema).toEqual(fromFile);
  });
});
