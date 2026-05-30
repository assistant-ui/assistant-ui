import { toJSONSchema } from "assistant-stream";
import type { JSONSchema7 } from "json-schema";
import { TYPE_KEY } from "./constants";
import type { GenerativeUILibrary } from "./types";

/**
 * Builds the JSON schema for the `present` tool from a {@link GenerativeUILibrary}.
 *
 * The model produces a single node `{ $type, ...props }` where `$type` selects
 * a component and the remaining keys are its props. We model this as a
 * discriminated union on `$type`: the root is an object (so providers that
 * require object-typed tool parameters accept it) whose `oneOf` branches refine
 * the props for each component. A node is reused via `$defs` so `children` can
 * nest the tree arbitrarily deep.
 */
export function buildPresentParameters(
  library: GenerativeUILibrary,
): JSONSchema7 {
  const names = Object.keys(library);

  const branches: JSONSchema7[] = names.map((name) => {
    const { description, properties } = library[name]!;
    const propsSchema = toJSONSchema(properties);
    return {
      properties: {
        [TYPE_KEY]: { const: name, description },
        ...propsSchema.properties,
      },
      required: propsSchema.required ?? [],
    };
  });

  const node: JSONSchema7 = {
    type: "object",
    properties: {
      [TYPE_KEY]: {
        type: "string",
        enum: names,
        description: "The component to render.",
      },
      children: { $ref: "#/$defs/children" },
    },
    required: [TYPE_KEY],
    ...(branches.length > 0 ? { oneOf: branches } : {}),
  };

  const children: JSONSchema7 = {
    description: "Nested generative UI rendered inside this component.",
    anyOf: [
      { type: "string" },
      { $ref: "#/$defs/node" },
      {
        type: "array",
        items: { anyOf: [{ type: "string" }, { $ref: "#/$defs/node" }] },
      },
    ],
  };

  return {
    ...node,
    $defs: { node, children },
  };
}
