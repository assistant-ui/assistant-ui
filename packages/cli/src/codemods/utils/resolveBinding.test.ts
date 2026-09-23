import { describe, expect, it } from "vitest";
import jscodeshift from "jscodeshift";
import { resolveBinding } from "./resolveBinding";

const j = jscodeshift.withParser("tsx");

describe("resolveBinding", () => {
  it.each([
    ["namespace Local { const client = inner(); read(client); }", "inner"],
    [
      "namespace Local { if (ready) { var client = inner(); } read(client); }",
      "inner",
    ],
    ["namespace Local { var client = inner(); } read(client);", "outer"],
    [
      "function worker() { if (ready) { var client = inner(); } read(client); }",
      "inner",
    ],
    [
      "function worker(value = read(client)) { var client = inner(); }",
      "outer",
    ],
    ["{ const client = inner(); read(client); }", "inner"],
    ["{ const { client } = inner(); read(client); }", "inner"],
    ["{ const [client] = inner(); read(client); }", "inner"],
    [
      "function worker() { { const client = inner(); } read(client); }",
      "outer",
    ],
    ["switch (read(client)) { case 1: const client = inner(); }", "outer"],
    [
      "switch (value) { case 1: const client = inner(); read(client); }",
      "inner",
    ],
    ["for (const client = inner(); ready;) { read(client); }", "inner"],
    [
      "function worker() { function other() { var client = inner(); } read(client); }",
      "outer",
    ],
    ["{ type client = Other; read(client); }", "outer"],
  ])("resolves %s", (scope, expected) => {
    const root = j(`const client = outer(); ${scope}`);
    const reference = root
      .find(j.CallExpression, { callee: { name: "read" } })
      .paths()[0]!
      .get("arguments", 0);
    const binding = resolveBinding(j, reference, "client");
    const declaration = root
      .find(j.VariableDeclarator, { init: { callee: { name: expected } } })
      .nodes()[0]!;
    const identifiers = j(declaration.id)
      .find(j.Identifier, { name: "client" })
      .nodes();
    expect(binding).toBe(
      j.Identifier.check(declaration.id) ? declaration.id : identifiers.at(-1),
    );
  });

  it.each([
    "function worker(client) { read(client); }",
    "function worker({ client }) { read(client); }",
    "function worker(client = fallback) { read(client); }",
    "try {} catch (client) { read(client); }",
    "class Reader { constructor(private client: Client) { read(client); } }",
  ])("resolves a parameter binding: %s", (source) => {
    const root = j(source);
    const reference = root
      .find(j.CallExpression, { callee: { name: "read" } })
      .paths()[0]!
      .get("arguments", 0);
    const binding = resolveBinding(j, reference, "client");
    expect(binding?.name).toBe("client");
    expect(binding).not.toBe(reference.value);
  });

  it("resolves imports and distinguishes an unbound identifier", () => {
    const root = j('import { client } from "./client"; read(client);');
    const reference = root
      .find(j.CallExpression)
      .paths()[0]!
      .get("arguments", 0);
    expect(resolveBinding(j, reference, "client")).toBe(
      root.find(j.ImportSpecifier).nodes()[0]!.local,
    );
    expect(resolveBinding(j, reference, "missing")).toBeUndefined();
  });
});
