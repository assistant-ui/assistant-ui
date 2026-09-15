import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildPresentParameters } from "./buildPresentParameters";

const component = (properties: z.ZodType) => ({
  description: "A component",
  properties,
  render: () => null,
});

function resolve(root: JSONSchema7, value: JSONSchema7Definition) {
  let schema = value as JSONSchema7;
  if (schema.$ref === "#") return root;
  if (schema.$ref) {
    expect(schema.$ref).toMatch(/^#\//);
    let target: unknown = root;
    for (const segment of schema.$ref.slice(2).split("/")) {
      const key = decodeURIComponent(segment)
        .replace(/~1/g, "/")
        .replace(/~0/g, "~");
      target = (target as Record<string, unknown> | undefined)?.[key];
    }
    expect(target).toBeDefined();
    schema = target as JSONSchema7;
  }
  return schema;
}

describe("component schema references", () => {
  it("retains recursive definitions used by a component prop", () => {
    const Tree = z.object({
      label: z.string(),
      get descendants() {
        return z.array(Tree);
      },
    });
    const schema = buildPresentParameters({
      Tree: component(z.object({ tree: Tree })),
    });
    const tree = resolve(schema, schema.properties!.tree!);
    expect(tree.properties!.label).toEqual({ type: "string" });
    const descendants = tree.properties!.descendants as JSONSchema7;
    expect(resolve(schema, descendants.items as JSONSchema7Definition)).toBe(
      tree,
    );
  });

  it("keeps definitions with the same generated name isolated across components", () => {
    const TextTree = z.object({
      value: z.string(),
      get descendants() {
        return z.array(TextTree);
      },
    });
    const NumberTree = z.object({
      value: z.number(),
      get descendants() {
        return z.array(NumberTree);
      },
    });
    const schema = buildPresentParameters({
      node: component(z.object({ textTree: TextTree })),
      children: component(z.object({ numberTree: NumberTree })),
    });
    const textTree = resolve(schema, schema.properties!.textTree!);
    const numberTree = resolve(schema, schema.properties!.numberTree!);
    expect(textTree.properties!.value).toEqual({ type: "string" });
    expect(numberTree.properties!.value).toEqual({ type: "number" });
    expect(
      resolve(
        schema,
        (textTree.properties!.descendants as JSONSchema7)
          .items as JSONSchema7Definition,
      ),
    ).toBe(textTree);
    expect(
      resolve(
        schema,
        (numberTree.properties!.descendants as JSONSchema7)
          .items as JSONSchema7Definition,
      ),
    ).toBe(numberTree);
    expect(resolve(schema, schema.properties!.children!).anyOf).toBeDefined();
    expect((schema.$defs!.node as JSONSchema7).properties!.$type).toBeDefined();
  });

  it("rebases root references to component props instead of the generated UI node", () => {
    const Props = z.object({
      label: z.string(),
      get nested() {
        return z.array(Props);
      },
    });
    const schema = buildPresentParameters({ Recursive: component(Props) });
    const nested = schema.properties!.nested as JSONSchema7;
    const props = resolve(schema, nested.items as JSONSchema7Definition);
    expect(props.properties!.label).toEqual({ type: "string" });
    expect(props.properties!.$type).toBeUndefined();
    expect(props.required).toEqual(["label", "nested"]);
  });

  it("rebases recursive references inside unions and records", () => {
    const Tree = z.object({
      get branches() {
        return z.record(z.string(), z.union([z.string(), Tree]));
      },
    });
    const schema = buildPresentParameters({
      Tree: component(z.object({ tree: Tree })),
    });
    const tree = resolve(schema, schema.properties!.tree!);
    const branches = tree.properties!.branches as JSONSchema7;
    const variants = (branches.additionalProperties as JSONSchema7).anyOf!;
    expect(resolve(schema, variants[1]!)).toBe(tree);
  });

  it("leaves literal reference-shaped data and non-recursive schemas unchanged", () => {
    const literal = {
      $ref: "#/literal",
      properties: { nested: { $ref: "#" } },
    };
    const schema = buildPresentParameters({
      Card: component(
        z.object({
          label: z.string().meta({ examples: [literal], default: literal }),
        }),
      ),
    });
    expect(schema.properties!.label).toEqual({
      type: "string",
      examples: [literal],
      default: literal,
    });
    expect(Object.keys(schema.$defs!)).toEqual(["node", "children"]);
  });
});
