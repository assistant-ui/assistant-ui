import { ICON_NAMES, type UIElement } from "../ir";
import {
  A2UI_SURFACE_ID,
  type A2uiSurfaceState,
  type A2uiTemplateChildren,
} from "./types";
import { evaluateA2uiValueFunction } from "./valueFunctions";

const DEPTH_CAP = 32;
const TEMPLATE_ITEM_CAP = 100;
const NODE_BUDGET = 5000;

const SUPPORTED_COMPONENTS = new Set([
  "Text",
  "Image",
  "Icon",
  "Row",
  "Column",
  "List",
  "Card",
  "Divider",
  "Button",
  "TextField",
  "CheckBox",
  "ChoicePicker",
  "DateTimeInput",
]);

const ICON_NAME_SET: ReadonlySet<string> = new Set(ICON_NAMES);
const ICON_SIZE_SET: ReadonlySet<string> = new Set(["sm", "md", "lg"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const setOwnProperty = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) => {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    target[key] = value;
  }
};

const isValueFunctionProperty = (key: string): boolean =>
  key !== "action" && key !== "checks";

const isBinding = (value: unknown): value is { readonly path: string } =>
  isPlainObject(value) &&
  Object.keys(value).length === 1 &&
  typeof value["path"] === "string";

const isTemplateChildren = (value: unknown): value is A2uiTemplateChildren =>
  isPlainObject(value) &&
  Object.keys(value).length === 1 &&
  isPlainObject(value["template"]) &&
  Object.keys(value["template"]).length === 2 &&
  typeof value["template"]["componentId"] === "string" &&
  typeof value["template"]["path"] === "string";

const decodePointer = (path: string): string[] | undefined => {
  if (path === "" || path === "/") return [];
  if (!path.startsWith("/")) return undefined;
  return path
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
};

const resolvePointer = (source: unknown, path: string): unknown => {
  const segments = decodePointer(path);
  if (!segments) return undefined;
  let current = source;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return undefined;
      current = current[Number(segment)];
      continue;
    }
    if (!isRecord(current) || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

const bindingPath = (value: unknown): string | undefined =>
  isBinding(value) ? value.path : undefined;

const lastPointerSegment = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  const segments = decodePointer(path);
  return segments?.at(-1);
};

const materialize = (
  value: unknown,
  source: unknown,
  context: ConversionContext,
  evaluateCalls = true,
  functionDepth = 0,
): unknown => {
  if (isBinding(value)) return resolvePointer(source, value.path);
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        materialize(entry, source, context, evaluateCalls, functionDepth),
      )
      .filter((entry) => entry !== undefined);
  }
  if (!isPlainObject(value)) return value;
  if (evaluateCalls && Object.hasOwn(value, "call")) {
    if (typeof value["call"] !== "string" || !isPlainObject(value["args"])) {
      context.warnings.push("A2UI value function call is malformed.");
      return undefined;
    }
    if (functionDepth >= DEPTH_CAP) {
      context.warnings.push("A2UI value function depth cap was reached.");
      return undefined;
    }
    const args = materialize(
      value["args"],
      source,
      context,
      evaluateCalls,
      functionDepth + 1,
    );
    if (!isPlainObject(args)) return undefined;
    const pathResolver = (path: string) =>
      resolvePointer(
        source,
        path.startsWith("/")
          ? path
          : `/${path
              .split("/")
              .map((segment) =>
                segment.replaceAll("~", "~0").replaceAll("/", "~1"),
              )
              .join("/")}`,
      );
    return evaluateA2uiValueFunction(value["call"], args, {
      resolvePath: pathResolver,
      warn: (message) => context.warnings.push(message),
    });
  }
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const resolved = materialize(
      entry,
      source,
      context,
      evaluateCalls && isValueFunctionProperty(key),
      functionDepth,
    );
    if (resolved !== undefined) {
      setOwnProperty(result, key, resolved);
    }
  }
  return result;
};

const firstDefined = (
  props: Record<string, unknown>,
  keys: readonly string[],
): unknown => {
  for (const key of keys) {
    if (props[key] !== undefined) return props[key];
  }
  return undefined;
};

const stringProp = (
  props: Record<string, unknown>,
  keys: readonly string[],
): string | undefined => {
  const value = firstDefined(props, keys);
  return typeof value === "string" ? value : undefined;
};

const sourceSurfaceId = (surface: A2uiSurfaceState): string =>
  (surface as A2uiSurfaceState & { [A2UI_SURFACE_ID]?: string })[
    A2UI_SURFACE_ID
  ] ?? "";

type ConversionContext = {
  readonly surface: A2uiSurfaceState;
  readonly surfaceId: string;
  readonly warnings: string[];
  emittedNodes: number;
  depthWarned: boolean;
  budgetWarned: boolean;
  templateCapWarned: boolean;
  readonly keepUnknownComponents: boolean;
};

const reserveNode = (context: ConversionContext): boolean => {
  if (context.emittedNodes >= NODE_BUDGET) {
    if (!context.budgetWarned) {
      context.warnings.push(`A2UI node budget of ${NODE_BUDGET} was reached.`);
      context.budgetWarned = true;
    }
    return false;
  }
  context.emittedNodes++;
  return true;
};

const childReferences = (node: Record<string, unknown>): unknown[] => {
  const children = node["children"];
  const references: unknown[] = Array.isArray(children) ? [...children] : [];
  if (node["child"] !== undefined) references.push(node["child"]);
  if (node["component"] === "Modal") {
    references.push(node["trigger"], node["content"]);
  }
  if (node["component"] === "Tabs" && Array.isArray(node["tabs"])) {
    for (const tab of node["tabs"]) {
      references.push(isRecord(tab) ? tab["child"] : undefined);
    }
  }
  return references;
};

const childrenOf = (
  node: Record<string, unknown>,
  dataSource: unknown,
  context: ConversionContext,
  depth: number,
  visited: Set<string>,
): UIElement[] => {
  const result: UIElement[] = [];
  for (const childId of childReferences(node)) {
    if (typeof childId !== "string") {
      context.warnings.push(
        `Component "${String(node["id"] ?? "")}" has a malformed child reference.`,
      );
      continue;
    }
    const child = convertComponent(
      childId,
      dataSource,
      context,
      depth + 1,
      visited,
    );
    if (child) result.push(child);
  }
  return result;
};

const textLabel = (
  node: Record<string, unknown>,
  children: readonly UIElement[],
  context: ConversionContext,
): string | undefined => {
  const references = childReferences(node);
  const [reference] = references;
  const [child] = children;
  if (
    references.length !== 1 ||
    children.length !== 1 ||
    typeof reference !== "string" ||
    !child ||
    context.surface.components.get(reference)?.["component"] !== "Text"
  ) {
    return undefined;
  }
  const text = child.$type === "Header" ? child["text"] : child["value"];
  return typeof text === "string" ? text : undefined;
};

const mappedAction = (
  node: Record<string, unknown>,
  props: Record<string, unknown>,
  context: ConversionContext,
): UIElement["$action"] | undefined => {
  const action = props["action"];
  if (action === undefined) return undefined;
  const source = {
    surfaceId: context.surfaceId,
    sourceComponentId: typeof node["id"] === "string" ? node["id"] : "",
  };
  const event =
    isRecord(action) && isRecord(action["event"]) ? action["event"] : action;
  const actionName =
    typeof event === "string"
      ? event
      : isRecord(event) && typeof event["name"] === "string"
        ? event["name"]
        : undefined;
  if (actionName) {
    const actionContext = isRecord(event) ? event["context"] : undefined;
    return {
      type: "a2ui:action",
      name: actionName,
      ...source,
      ...(actionContext !== undefined ? { context: actionContext } : {}),
    };
  }
  const functionCall = isRecord(action) ? action["functionCall"] : undefined;
  if (isRecord(functionCall) && typeof functionCall["call"] === "string") {
    const args = functionCall["args"];
    return {
      type: "a2ui:functionCall",
      call: functionCall["call"],
      ...source,
      ...(isRecord(args) ? { args } : {}),
    };
  }
  context.warnings.push(
    `Component "${String(node["id"] ?? "")}" has a malformed action.`,
  );
  return undefined;
};

const choiceOptions = (value: unknown): { label: string; value: string }[] => {
  if (!Array.isArray(value)) return [];
  const options: { label: string; value: string }[] = [];
  for (const option of value) {
    if (
      isRecord(option) &&
      typeof option["label"] === "string" &&
      typeof option["value"] === "string"
    ) {
      options.push({ label: option["label"], value: option["value"] });
    }
  }
  return options;
};

const mappedProps = (
  node: Record<string, unknown>,
  props: Record<string, unknown>,
  context: ConversionContext,
): UIElement | undefined => {
  const component = node["component"];

  if (component === "Text") {
    const text = stringProp(props, ["text", "value"]);
    const variant = props["variant"];
    if (typeof variant === "string" && /^h[1-6]$/.test(variant)) {
      return {
        $type: "Header",
        ...(text !== undefined ? { text } : {}),
      };
    }
    if (variant === "caption") {
      return {
        $type: "Caption",
        ...(text !== undefined ? { value: text } : {}),
      };
    }
    return {
      $type: "Markdown",
      ...(text !== undefined ? { value: text } : {}),
    };
  }

  if (component === "Image") {
    const src = stringProp(props, ["src", "url"]);
    const alt = stringProp(props, ["alt", "altText", "description"]);
    const size = props["size"];
    const round = props["round"];
    return {
      $type: "Image",
      ...(src !== undefined ? { src } : {}),
      ...(alt !== undefined ? { alt } : {}),
      ...(typeof size === "string" || typeof size === "number" ? { size } : {}),
      ...(typeof round === "boolean" ? { round } : {}),
    };
  }

  if (component === "Icon") {
    const name = stringProp(props, ["name"]);
    if (!name || !ICON_NAME_SET.has(name)) return undefined;
    const size = props["size"];
    return {
      $type: "Icon",
      name,
      ...(typeof size === "string" && ICON_SIZE_SET.has(size) ? { size } : {}),
    };
  }

  if (component === "Row") {
    const gap = props["gap"];
    const align = firstDefined(props, ["align", "alignment"]);
    const justify = firstDefined(props, ["justify", "distribution"]);
    return {
      $type: "Row",
      ...(typeof gap === "number" ? { gap } : {}),
      ...(typeof align === "string" ? { align } : {}),
      ...(typeof justify === "string" ? { justify } : {}),
    };
  }

  if (component === "Column") {
    const gap = props["gap"];
    const align = firstDefined(props, ["align", "alignment"]);
    return {
      $type: "Col",
      ...(typeof gap === "number" ? { gap } : {}),
      ...(typeof align === "string" ? { align } : {}),
    };
  }

  if (component === "List") {
    const direction = props["direction"];
    const align = props["align"];
    if (direction === "horizontal") {
      return {
        $type: "Row",
        ...(typeof align === "string" ? { align } : {}),
      };
    }
    return { $type: "ListView" };
  }

  if (component === "Card") {
    const title = props["title"];
    const padding = props["padding"];
    const background = props["background"];
    return {
      $type: "Card",
      ...(typeof title === "string" ? { title } : {}),
      ...(typeof padding === "number" ? { padding } : {}),
      ...(typeof background === "string" ? { background } : {}),
    };
  }

  if (component === "Divider") {
    return {
      $type: "Divider",
      ...(typeof props["flush"] === "boolean" ? { flush: props["flush"] } : {}),
    };
  }

  if (component === "Button") {
    const label = stringProp(props, ["label", "text"]);
    const variantStyle =
      props["variant"] === "primary"
        ? "primary"
        : props["variant"] === "borderless"
          ? "ghost"
          : undefined;
    const buttonStyle =
      typeof props["buttonStyle"] === "string"
        ? props["buttonStyle"]
        : variantStyle;
    const block = props["block"];
    const submit = props["submit"];
    const action = mappedAction(node, props, context);
    return {
      $type: "Button",
      ...(label !== undefined ? { label } : {}),
      ...(buttonStyle !== undefined ? { buttonStyle } : {}),
      ...(typeof block === "boolean" ? { block } : {}),
      ...(typeof submit === "boolean" ? { submit } : {}),
      ...(action ? { $action: action } : {}),
    };
  }

  const binding = firstDefined(node, ["text", "value", "binding"]);
  const name = lastPointerSegment(bindingPath(binding));
  const label = stringProp(props, ["label"]);

  if (component === "TextField") {
    const placeholder = stringProp(props, ["placeholder"]);
    const multiline =
      typeof props["multiline"] === "boolean"
        ? props["multiline"]
        : props["variant"] === "longText" ||
            props["textFieldType"] === "longText"
          ? true
          : undefined;
    return {
      $type: "Input",
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(multiline !== undefined ? { multiline } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(name !== undefined ? { name } : {}),
    };
  }

  if (component === "CheckBox") {
    const defaultChecked = firstDefined(props, ["defaultChecked", "value"]);
    return {
      $type: "Checkbox",
      ...(label !== undefined ? { label } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(typeof defaultChecked === "boolean" ? { defaultChecked } : {}),
    };
  }

  if (component === "ChoicePicker") {
    const options = choiceOptions(props["options"]);
    const value = props["value"];
    const selected =
      typeof value === "string"
        ? [value]
        : Array.isArray(value)
          ? value.filter((entry): entry is string => typeof entry === "string")
          : [];
    if (props["variant"] === "multipleSelection") {
      return {
        $type: "CheckboxGroup",
        options,
        ...(label !== undefined ? { label } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(selected.length > 0 ? { defaultValue: selected } : {}),
      };
    }
    if (props["displayStyle"] === "chips") {
      const placeholder = stringProp(props, ["placeholder"]);
      return {
        $type: "Select",
        options,
        ...(placeholder !== undefined ? { placeholder } : {}),
        ...(label !== undefined ? { label } : {}),
        ...(name !== undefined ? { name } : {}),
      };
    }
    const [defaultValue] = selected;
    return {
      $type: "RadioGroup",
      options,
      ...(label !== undefined ? { label } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
    };
  }

  if (component === "DateTimeInput") {
    const value = stringProp(props, ["value"]);
    const min = stringProp(props, ["min"]);
    const max = stringProp(props, ["max"]);
    return {
      $type: "DatePicker",
      ...(value !== undefined ? { value } : {}),
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(name !== undefined ? { name } : {}),
    };
  }

  return undefined;
};

const convertTemplate = (
  node: Record<string, unknown>,
  templateChildren: A2uiTemplateChildren,
  dataSource: unknown,
  context: ConversionContext,
  depth: number,
  visited: Set<string>,
  retained?: UIElement,
  mappedContainer?: UIElement,
): UIElement | null => {
  if (!reserveNode(context)) return null;
  const horizontalList =
    node["component"] === "List" &&
    materialize(node["direction"], dataSource, context) === "horizontal";
  const container = mappedContainer ??
    retained ?? {
      $type: horizontalList ? "Row" : "ListView",
    };
  const list = resolvePointer(dataSource, templateChildren.template.path);
  if (!Array.isArray(list)) {
    context.warnings.push(
      `Template on component "${String(node["id"] ?? "")}" did not resolve to a list.`,
    );
    return { ...container, children: [] };
  }
  const itemCount = Math.min(list.length, TEMPLATE_ITEM_CAP);
  if (list.length > TEMPLATE_ITEM_CAP && !context.templateCapWarned) {
    context.warnings.push(
      `A2UI template expansion was capped at ${TEMPLATE_ITEM_CAP} items.`,
    );
    context.templateCapWarned = true;
  }
  const children: UIElement[] = [];
  for (let index = 0; index < itemCount; index++) {
    if (!retained && !horizontalList && !reserveNode(context)) break;
    const child = convertComponent(
      templateChildren.template.componentId,
      list[index],
      context,
      depth + 1,
      visited,
    );
    if (retained || horizontalList) {
      if (child) children.push(child);
    } else {
      children.push({
        $type: "ListViewItem",
        ...(child ? { children: child } : {}),
      });
    }
  }
  return { ...container, children };
};

function convertComponent(
  componentId: string,
  dataSource: unknown,
  context: ConversionContext,
  depth: number,
  visited: Set<string>,
): UIElement | null {
  if (depth >= DEPTH_CAP) {
    if (!context.depthWarned) {
      context.warnings.push(`A2UI depth cap of ${DEPTH_CAP} was reached.`);
      context.depthWarned = true;
    }
    return null;
  }
  if (visited.has(componentId)) {
    context.warnings.push(`A2UI component cycle detected at "${componentId}".`);
    return null;
  }
  const node = context.surface.components.get(componentId);
  if (!node) {
    context.warnings.push(`A2UI component "${componentId}" was not found.`);
    return null;
  }
  const component = node["component"];

  visited.add(componentId);
  try {
    if (typeof component !== "string") {
      context.warnings.push(
        `Unknown A2UI component "${String(component ?? "")}" was skipped.`,
      );
      return null;
    }
    const templateChildren = node["children"];
    const hasTemplate = isTemplateChildren(templateChildren);
    if (
      !SUPPORTED_COMPONENTS.has(component) &&
      !context.keepUnknownComponents &&
      !hasTemplate
    ) {
      context.warnings.push(
        `Unknown A2UI component "${component}" was skipped.`,
      );
      return null;
    }
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (
        key === "id" ||
        key === "component" ||
        key === "children" ||
        key === "child"
      ) {
        continue;
      }
      const resolved = materialize(
        value,
        dataSource,
        context,
        isValueFunctionProperty(key),
      );
      if (resolved !== undefined) setOwnProperty(props, key, resolved);
    }
    const mapped = mappedProps(node, props, context);
    if (!mapped && SUPPORTED_COMPONENTS.has(component)) {
      context.warnings.push(
        `A2UI component "${component}" could not be mapped and was skipped.`,
      );
      return null;
    }
    const retained =
      !mapped && context.keepUnknownComponents
        ? {
            $type: component,
            ...Object.fromEntries(
              Object.entries(props).filter(([key]) => !key.startsWith("$")),
            ),
          }
        : undefined;
    if (hasTemplate) {
      return convertTemplate(
        node,
        templateChildren,
        dataSource,
        context,
        depth,
        visited,
        retained,
        component === "List" ? mapped : undefined,
      );
    }
    if (!reserveNode(context)) return null;
    const converted = mapped ?? retained;
    if (!converted) return null;
    const children = childrenOf(node, dataSource, context, depth, visited);
    if (mapped?.$type === "Button" && mapped["label"] === undefined) {
      const label = textLabel(node, children, context);
      if (label !== undefined) return { ...mapped, label };
    }
    const listChildren =
      component === "List" && mapped?.$type === "ListView"
        ? children.map((child) => ({ $type: "ListViewItem", children: child }))
        : children;
    return {
      ...converted,
      ...(listChildren.length > 0 ? { children: listChildren } : {}),
    };
  } finally {
    visited.delete(componentId);
  }
}

export function convertSurfaceToUISpec(
  surface: A2uiSurfaceState,
  options: { readonly keepUnknownComponents?: boolean } = {},
): {
  spec: UIElement | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!surface.components.has("root")) {
    return {
      spec: null,
      warnings: ['A2UI root component "root" was not found.'],
    };
  }
  const context: ConversionContext = {
    surface,
    surfaceId: sourceSurfaceId(surface),
    warnings,
    emittedNodes: 0,
    depthWarned: false,
    budgetWarned: false,
    templateCapWarned: false,
    keepUnknownComponents: options.keepUnknownComponents === true,
  };
  try {
    const spec = convertComponent(
      "root",
      surface.dataModel,
      context,
      0,
      new Set(),
    );
    return { spec, warnings };
  } catch {
    warnings.push("A2UI surface conversion encountered malformed input.");
    return { spec: null, warnings };
  }
}
