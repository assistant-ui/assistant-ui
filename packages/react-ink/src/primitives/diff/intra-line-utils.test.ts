import { describe, expect, it } from "vitest";
import { parsePatch } from "./diff-utils";
import { buildLinePairMap } from "./intra-line-utils";

describe("buildLinePairMap for parsed patches", () => {
  it("only pairs replacements within the same hunk", () => {
    const [file] = parsePatch(`diff --git a/f.txt b/f.txt
--- a/f.txt
+++ b/f.txt
@@ -1 +0,0 @@
-shared delete
@@ -4,0 +4 @@
+shared add
@@ -9 +9 @@
-shared old
+shared new
@@ -10,0 +11 @@
+shared tail
`);

    expect(
      [...buildLinePairMap(file!.lines)].map(([del, add]) => [
        del.content,
        add.content,
      ]),
    ).toEqual([["shared old", "shared new"]]);
  });
});
