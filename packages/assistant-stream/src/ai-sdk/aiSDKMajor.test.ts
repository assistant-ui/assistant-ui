import { expect, it } from "vitest";
import { supportsTaggedFileData } from "./aiSDKMajor";

// The peer union is only honest if each vitest leg loads the major it claims:
// a broken alias would silently re-run the v7 suite and report both covered.
it("loads the ai major this leg advertises", async () => {
  const { version } = (await import("ai/package.json")) as unknown as {
    version: string;
  };
  expect(version.split(".")[0]).toBe(process.env["AI_PEER_MAJOR"]);
});

it("detects the tagged file part only on ai@7", () => {
  expect(supportsTaggedFileData).toBe(process.env["AI_PEER_MAJOR"] === "7");
});
