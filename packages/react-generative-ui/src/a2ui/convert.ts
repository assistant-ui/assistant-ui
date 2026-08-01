import type { UIElement } from "../ir";
import {
  A2UI_SURFACE_ID,
  type A2uiSurfaceState,
  type A2uiTemplateChildren,
} from "./types";

const DEPTH_CAP = 32;
const TEMPLATE_ITEM_CAP = 100;
const NODE_BUDGET = 5000;

const SUPPORTED_COMPONENTS = new Set([
  "Text",
  "Image",
  "Row",
  "Column",
  "Card",
  "Divider",
  "Button",
  "TextField",
  "CheckBox",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

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

const materialize = (value: unknown, source: unknown): unknown => {
  if (isBinding(value)) return resolvePointer(source, value.path);
  if (Array.isArray(value)) {
    return value
      .map((entry) => materialize(entry, source))
      .filter((entry) => entry !== undefined);
  }
  if (!isPlainObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const resolved = materialize(entry, source);
    if (resolved !== undefined) result[key] = resolved;
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

const childrenOf = (
  node: Record<string, unknown>,
  dataSource: unknown,
  context: ConversionContext,
  depth: number,
  visited: Set<string>,
): UIElement[] => {
  const children = node["children"];
  if (!Array.isArray(children)) return [];
  const result: UIElement[] = [];
  for (const childId of children) {
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

const mappedAction = (
  node: Record<string, unknown>,
  props: Record<string, unknown>,
  dataSource: unknown,
  context: ConversionContext,
): UIElement["$action"] | undefined => {
  const action = props["action"];
  const actionName =
    typeof action === "string"
      ? action
      : isRecord(action) && typeof action["name"] === "string"
        ? action["name"]
        : undefined;
  if (!actionName) return undefined;
  const rawContext = isRecord(action) ? action["context"] : undefined;
  const resolvedContext =
    rawContext === undefined ? undefined : materialize(rawContext, dataSource);
  return {
    type: "a2ui:action",
    name: actionName,
    surfaceId: context.surfaceId,
    sourceComponentId: typeof node["id"] === "string" ? node["id"] : "",
    ...(resolvedContext !== undefined ? { context: resolvedContext } : {}),
  };
};

const mappedProps = (
  node: Record<string, unknown>,
  props: Record<string, unknown>,
  dataSource: unknown,
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
    const alt = stringProp(props, ["alt", "altText"]);
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
    const buttonStyle = props["buttonStyle"];
    const block = props["block"];
    const submit = props["submit"];
    const action = mappedAction(node, props, dataSource, context);
    return {
      $type: "Button",
      ...(label !== undefined ? { label } : {}),
      ...(typeof buttonStyle === "string" ? { buttonStyle } : {}),
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
        : props["textFieldType"] === "longText"
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

  return undefined;
};

const convertTemplate = (
  node: Record<string, unknown>,
  templateChildren: A2uiTemplateChildren,
  dataSource: unknown,
  context: ConversionContext,
  depth: number,
  visited: Set<string>,
): UIElement | null => {
  if (!reserveNode(context)) return null;
  const list = resolvePointer(dataSource, templateChildren.template.path);
  if (!Array.isArray(list)) {
    context.warnings.push(
      `Template on component "${String(node["id"] ?? "")}" did not resolve to a list.`,
    );
    return { $type: "ListView", children: [] };
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
    if (!reserveNode(context)) break;
    const child = convertComponent(
      templateChildren.template.componentId,
      list[index],
      context,
      depth + 1,
      visited,
    );
    children.push({
      $type: "ListViewItem",
      ...(child ? { children: child } : {}),
    });
  }
  return { $type: "ListView", children };
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
    const templateChildren = node["children"];
    if (isTemplateChildren(templateChildren)) {
      return convertTemplate(
        node,
        templateChildren,
        dataSource,
        context,
        depth,
        visited,
      );
    }
    if (typeof component !== "string" || !SUPPORTED_COMPONENTS.has(component)) {
      context.warnings.push(
        `Unknown A2UI component "${String(component ?? "")}" was skipped.`,
      );
      return null;
    }
    if (!reserveNode(context)) return null;
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "id" || key === "component" || key === "children") continue;
      const resolved = materialize(value, dataSource);
      if (resolved !== undefined) props[key] = resolved;
    }
    const mapped = mappedProps(node, props, dataSource, context);
    if (!mapped) return null;
    const children = childrenOf(node, dataSource, context, depth, visited);
    return {
      ...mapped,
      ...(children.length > 0 ? { children } : {}),
    };
  } finally {
    visited.delete(componentId);
  }
}

export function convertSurfaceToUISpec(surface: A2uiSurfaceState): {
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
