import jscodeshift, { type API } from "jscodeshift";
import { describe, expect, it } from "vitest";
import { createTransformer } from "./createTransformer";

const renameFoo = createTransformer(({ j, root, markAsChanged }) => {
  root.find(j.Identifier, { name: "foo" }).forEach((path) => {
    path.node.name = "bar";
    markAsChanged();
  });
});

const j = jscodeshift.withParser("tsx");
const api: API = { jscodeshift: j, j, stats: () => {}, report: () => {} };

describe("createTransformer", () => {
  it.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
  ])("keeps %s line endings in a transformed file", (_name, eol) => {
    const source = ["const foo = 1;", "", "console.log(foo);", ""].join(eol);

    expect(renameFoo({ path: "file.tsx", source }, api, {})).toBe(
      ["const bar = 1;", "", "console.log(bar);", ""].join(eol),
    );
  });
});
