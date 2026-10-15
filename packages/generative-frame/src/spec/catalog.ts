import {
  describeSchema,
  toJsonSchema,
  validateSchema,
  type JsonSchema,
  type SchemaIssue,
  type StandardSchemaLike,
} from "../json-schema";
import { isExpression } from "./expressions";
import { buildSpecPrompt, type SpecPromptOptions } from "./prompt";

export type PropsSchema = JsonSchema | StandardSchemaLike;

/** A component the model may use. Implementations are supplied per framework. */
export type ComponentDefinition = {
  description: string;
  /** JSON Schema for the props, or a Standard Schema (e.g. Zod 4) that can export one. */
  props?: PropsSchema;
  /**
   * Child slots. `"default"` maps to `children`; other names map to
   * `slots.<name>`. Components without slots take no children.
   */
  slots?: readonly string[];
  /** Events the component emits, which elements bind with `on`. */
  events?: readonly string[];
};

export type ActionDefinition = {
  description: string;
  params?: PropsSchema;
};

export type CatalogDefinition<
  TComponents extends Record<string, ComponentDefinition> = Record<
    string,
    ComponentDefinition
  >,
  TActions extends Record<string, ActionDefinition> = Record<
    string,
    ActionDefinition
  >,
> = {
  components: TComponents;
  actions?: TActions;
};

export type Catalog<
  TComponents extends Record<string, ComponentDefinition> = Record<
    string,
    ComponentDefinition
  >,
  TActions extends Record<string, ActionDefinition> = Record<
    string,
    ActionDefinition
  >,
> = {
  readonly components: TComponents;
  readonly actions: TActions;
  /** Component definition by name, or undefined. */
  component(type: string): ComponentDefinition | undefined;
  /** Action definition by name, including the built-in `setState`. */
  action(name: string): ActionDefinition | undefined;
  /** JSON Schema of a component's props, if it has one. */
  propsSchema(type: string): JsonSchema | undefined;
  /** Validates props, treating expression values as valid placeholders. */
  /** JSON Schema of an action's params, if it has one. */
  paramsSchema(action: string): JsonSchema | undefined;
  validateProps(type: string, props: unknown): SchemaIssue[];
  validateParams(action: string, params: unknown): SchemaIssue[];
  /** Model guidance for this catalog: components, actions, protocol, expressions, rules. */
  prompt(options?: SpecPromptOptions): string;
};

/** The built-in action every catalog accepts. */
export const SET_STATE_ACTION: ActionDefinition = {
  description: "Writes `value` at the JSON Pointer `path` in state.",
  params: {
    type: "object",
    properties: {
      path: { type: "string", description: "JSON Pointer into state" },
      value: { description: "The value to write" },
    },
    required: ["path"],
  },
};

const SEND_MESSAGE_ACTION: ActionDefinition = {
  description: "Sends `text` as the user's next message.",
  params: {
    type: "object",
    properties: { text: { type: "string", description: "The message" } },
    required: ["text"],
  },
};

const UPDATE_MODEL_CONTEXT_ACTION: ActionDefinition = {
  description:
    "Replaces what this UI tells the model about the user's choices with `text` and `data`.",
  params: {
    type: "object",
    properties: {
      text: { type: "string", description: "The choices in words" },
      data: { description: "The choices as data" },
    },
  },
};

const COPY_TEXT_ACTION: ActionDefinition = {
  description: "Copies `text` to the user's clipboard.",
  params: {
    type: "object",
    properties: { text: { type: "string", description: "The text to copy" } },
    required: ["text"],
  },
};

/** Built-in actions every catalog accepts; a host handles `sendMessage`, `updateModelContext`, and `copyText` the way it handles its own actions. */
const BUILT_IN_ACTIONS: Readonly<Record<string, ActionDefinition>> = {
  setState: SET_STATE_ACTION,
  sendMessage: SEND_MESSAGE_ACTION,
  updateModelContext: UPDATE_MODEL_CONTEXT_ACTION,
  copyText: COPY_TEXT_ACTION,
};

const skipExpressions = { skip: isExpression };

/**
 * Declares the components and actions a model may use in a spec. Props are
 * JSON Schema (or a Standard Schema exposing JSON Schema), so the catalog
 * stays dependency-free and works as model guidance and runtime validation.
 */
export function defineCatalog<
  const TComponents extends Record<string, ComponentDefinition>,
  const TActions extends Record<string, ActionDefinition> = Record<
    never,
    ActionDefinition
  >,
>(
  definition: CatalogDefinition<TComponents, TActions>,
): Catalog<TComponents, TActions> {
  const components = definition.components;
  const actions = (definition.actions ?? {}) as TActions;
  const schemaCache = new Map<string, JsonSchema | undefined>();

  const component = (type: string) =>
    Object.hasOwn(components, type) ? components[type] : undefined;
  for (const name of Object.keys(BUILT_IN_ACTIONS)) {
    if (Object.hasOwn(actions, name)) {
      throw new Error(
        `The action name "${name}" is reserved for the built-in action.`,
      );
    }
  }
  const action = (name: string) =>
    Object.hasOwn(BUILT_IN_ACTIONS, name)
      ? BUILT_IN_ACTIONS[name]
      : Object.hasOwn(actions, name)
        ? actions[name]
        : undefined;

  const catalog: Catalog<TComponents, TActions> = {
    components,
    actions,
    component,
    action,
    propsSchema(type) {
      if (!schemaCache.has(type)) {
        schemaCache.set(type, toJsonSchema(component(type)?.props));
      }
      return schemaCache.get(type);
    },
    paramsSchema(name) {
      const key = `action:${name}`;
      if (!schemaCache.has(key)) {
        schemaCache.set(key, toJsonSchema(action(name)?.params));
      }
      return schemaCache.get(key);
    },
    validateProps(type, props) {
      const schema = component(type)?.props;
      if (!schema) return [];
      return validateSchema(schema, props ?? {}, skipExpressions);
    },
    validateParams(name, params) {
      const schema = action(name)?.params;
      if (!schema) return [];
      return validateSchema(schema, params ?? {}, skipExpressions);
    },
    prompt: (options) => buildSpecPrompt(catalog, options),
  };
  return catalog;
}

/** One line describing a component's props for prompts and errors. */
export const describeProps = (catalog: Catalog, type: string) =>
  describeSchema(catalog.propsSchema(type));
