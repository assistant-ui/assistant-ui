import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as standalone from "./index";

describe("@assistant-ui/tap/standalone-shim parity", () => {
  it("exports every explicit react-shim hook plus its standalone additions", () => {
    const reactShimSource = readFileSync(
      resolve(__dirname, "../react-shim/index.ts"),
      "utf8",
    );
    const reactShimExports = [
      ...reactShimSource.matchAll(/export const (\w+)/g),
    ].map((match) => match[1]!);

    for (const name of reactShimExports) {
      expect(standalone).toHaveProperty(name);
    }

    expect(standalone).toHaveProperty("useInsertionEffect");
    expect(standalone).toHaveProperty("default");
  });
});
