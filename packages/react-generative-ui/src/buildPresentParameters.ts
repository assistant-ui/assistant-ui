import { toJSONSchema } from "assistant-stream";
import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { TYPE_KEY } from "./constants";
import type { GenerativeUILibrary } from "./types";

/**
 * Builds the JSON schema for the `present` tool from a {@link GenerativeUILibrary}.
 *
 * The model produces a node `{ $type, ...props }` where `$type` selects a
 * component and the rest are its props. The schema is a flat object: `$type` is
 * an enum of the component names, every component's props are merged into one
 * optional bag, and `children` recurses via `$defs` so the tree can nest.
 *
 * It is intentionally flat rather than a per-`$type` discriminated union. Tool /
 * function-call schemas (OpenAI and others) require the top-level parameters to
 * be a plain object and reject a top-level `oneOf`/`anyOf`/`enum`. So props can't
 * be refined per `$type` at the root; the model is guided instead by `$type`'s
 * description (which lists each component) and each prop's own description. The
 * renderer validates nothing here — an unknown `$type` or stray prop is handled
 * at render time — so a looser schema only costs the model a hint, not safety.
 */
export function buildPresentParameters(
  library: GenerativeUILibrary,
): JSONSchema7 {
  const names = Object.keys(library);

  // Merge every component's props into one optional bag. `$type`/`$key`/
  // `children` are framework-reserved, so drop any author-declared copies. On a
  // name clash the first component's schema wins — props are an advisory hint
  // here, not a strict per-component contract.
  const props: Record<string, JSONSchema7Definition> = {};
  const propOwners = new Map<string, string[]>();
  for (const name of names) {
    const propsSchema = toJSONSchema(library[name]!.properties);
    if (propsSchema.type !== "object") {
      throw new Error(
        `[@assistant-ui/react-generative-ui] Component "${name}": ` +
          "`properties` must be an object schema (e.g. `z.object({ ... })`).",
      );
    }
    for (const [key, schema] of Object.entries(propsSchema.properties ?? {})) {
      if (key === TYPE_KEY || key === "$key" || key === "children") continue;
      if (!(key in props)) {
        props[key] = schema;
      }
      propOwners.set(key, [...(propOwners.get(key) ?? []), name]);
    }
  }

  if (process.env["NODE_ENV"] !== "production") {
    for (const [key, owners] of propOwners) {
      if (owners.length < 2) continue;
      // eslint-disable-next-line no-console
      console.warn(
        `[@assistant-ui/react-generative-ui] Prop "${key}" is declared by ` +
          `${formatComponentList(owners)}; keeping "${owners[0]}"'s schema. ` +
          "Rename or align the prop type to avoid an ambiguous schema.",
      );
    }
  }

  // Carry each component's description on the `$type` enum, since there are no
  // per-branch schemas to hang them on anymore.
  const typeDescription =
    names.length > 0
      ? `The component to render. ${names
          .map((name) => `"${name}": ${library[name]!.description}`)
          .join("; ")}`
      : "The component to render.";

  const node: JSONSchema7 = {
    type: "object",
    properties: {
      [TYPE_KEY]: { type: "string", enum: names, description: typeDescription },
      $key: {
        description:
          "Stable identity for this UI node. Use it for list items that may reorder.",
        anyOf: [{ type: "string" }, { type: "number" }],
      },
      ...props,
      children: { $ref: "#/$defs/children" },
    },
    required: [TYPE_KEY],
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

function formatComponentList(names: string[]) {
  if (names.length <= 2) return names.map((name) => `"${name}"`).join(" and ");

  return `${names
    .slice(0, -1)
    .map((name) => `"${name}"`)
    .join(", ")}, and "${names[names.length - 1]}"`;
}
