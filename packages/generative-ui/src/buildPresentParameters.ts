import { toJSONSchema } from "assistant-stream";
import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { TYPE_KEY } from "./constants";
import type { GenerativeUILibrary } from "./types";
import { scopeSchema } from "./scopeSchema";
import { isDefaultGenerativeUIComponent } from "./defaultGenerativeUIComponents";

/**
 * Builds the JSON schema for the `present` tool from a {@link GenerativeUILibrary}.
 *
 * The model produces a node `{ $type, $key?, ...props }` where `$type` selects
 * a component, the optional `$key` pins a stable identity for list items that
 * may reorder, and the rest are its props. The schema is a flat object: `$type`
 * is an enum of the component names, every component's props are merged into
 * one optional bag, and `children` recurses via `$defs` so the tree can nest.
 *
 * It is intentionally flat rather than a per-`$type` discriminated union. Tool /
 * function-call schemas (OpenAI and others) require the top-level parameters to
 * be a plain object and reject a top-level `oneOf`/`anyOf`/`enum`. So props can't
 * be refined per `$type` at the root; when components share a prop, its schema
 * describes their distinct alternatives without tying them to `$type`. The
 * model is guided by `$type`'s description and each prop schema. The renderer
 * then drops a shared prop's value that the selected component's schema
 * rejects and another declaring component's schema accepts.
 */
export function buildPresentParameters(
  library: GenerativeUILibrary,
): JSONSchema7 {
  const names = Object.keys(library);

  // Merge every component's props into one optional bag. `$`-prefixed keys and
  // `children` are framework-reserved (see ir.ts), so drop any author-declared
  // copies.
  const props = new Map<string, JSONSchema7Definition[]>();
  const propSchemas = new Map<string, Set<string>>();
  const propOwners = new Map<string, string[]>();
  const componentSchemas: Record<string, JSONSchema7> = {};
  for (const [index, name] of names.entries()) {
    const definition = `component${index}`;
    const { schema: propsSchema, referenced } = scopeSchema(
      toJSONSchema(library[name]!.properties),
      `#/$defs/${definition}`,
    );
    if (propsSchema.type !== "object") {
      throw new Error(
        `[@assistant-ui/generative-ui] Component "${name}": ` +
          "`properties` must be an object schema (e.g. `z.object({ ... })`).",
      );
    }
    let merged = false;
    for (const [key, schema] of Object.entries(propsSchema.properties ?? {})) {
      if (key.startsWith("$") || key === "children") continue;
      // secure-json-parse rejects the whole tool-argument payload on this key,
      // so advertising it would cost the model the node rather than one prop.
      if (key === "__proto__") continue;
      const fingerprint = canonicalSerialize(schema);
      const seenSchemas = propSchemas.get(key) ?? new Set<string>();
      if (!seenSchemas.has(fingerprint)) {
        seenSchemas.add(fingerprint);
        propSchemas.set(key, seenSchemas);
        props.set(key, [...(props.get(key) ?? []), schema]);
        merged = true;
      }
      propOwners.set(key, [...(propOwners.get(key) ?? []), name]);
    }
    if (referenced && merged) {
      // `$schema` is only valid at a schema-resource root, and an embedded
      // `$id` would both collide across components and re-base the pointers
      // scopeSchema just rewrote to be document-root relative.
      const { $schema: _, $id: _id, ...embedded } = propsSchema;
      componentSchemas[definition] = embedded;
    }
  }

  if (process.env["NODE_ENV"] !== "production") {
    for (const [key, owners] of propOwners) {
      if (
        owners.length < 2 ||
        owners.every((name) =>
          isDefaultGenerativeUIComponent(name, library[name]!.properties),
        )
      ) {
        continue;
      }
      // eslint-disable-next-line no-console
      console.warn(
        `[@assistant-ui/generative-ui] Prop "${key}" is declared by ` +
          `${formatComponentList(owners)}; combining their schemas in the ` +
          "model hint.",
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
      ...Object.fromEntries(
        [...props].map(([key, schemas]) => [
          key,
          schemas.length === 1 ? schemas[0]! : { anyOf: schemas },
        ]),
      ),
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
    $defs: { node, children, ...componentSchemas },
  };
}

function canonicalSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalSerialize).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalSerialize((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? String(value);
}

function formatComponentList(names: string[]) {
  if (names.length <= 2) return names.map((name) => `"${name}"`).join(" and ");

  return `${names
    .slice(0, -1)
    .map((name) => `"${name}"`)
    .join(", ")}, and "${names[names.length - 1]}"`;
}
