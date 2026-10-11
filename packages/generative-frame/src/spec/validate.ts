import type { Catalog } from "./catalog";
import { escapePointerToken } from "./pointer";
import type { ActionBinding, Spec, SpecElement } from "./types";

export type SpecIssueCode =
  | "missing-root"
  | "unknown-root"
  | "invalid-element"
  | "unknown-type"
  | "invalid-props"
  | "missing-child"
  | "children-not-allowed"
  | "unknown-slot"
  | "cycle"
  | "unknown-event"
  | "unknown-action"
  | "invalid-params"
  | "invalid-repeat"
  | "unreachable"
  | "invalid-patch";

export type SpecIssue = {
  code: SpecIssueCode;
  severity: "error" | "warning";
  message: string;
  /** JSON Pointer into the spec where the issue is. */
  path: string;
  elementId?: string;
};

export type SpecValidation = { ok: boolean; issues: SpecIssue[] };

export type ValidateSpecOptions = {
  /**
   * The spec is still streaming: children that are not added yet are not
   * errors, and unreachable elements are not reported.
   */
  partial?: boolean;
};

const elementPath = (id: string) => `/elements/${escapePointerToken(id)}`;

const bindingsOf = (
  value: ActionBinding | ActionBinding[] | undefined,
): ActionBinding[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Checks a spec against a catalog: the root exists, every element has a
 * known type and valid props, children resolve and form no cycle, slots and
 * events are declared, and actions are known with valid params. Issues carry
 * JSON Pointers so a repair prompt can point at the exact place.
 */
export function validateSpec(
  spec: Spec,
  catalog: Catalog,
  options: ValidateSpecOptions = {},
): SpecValidation {
  const issues: SpecIssue[] = [];
  const error = (issue: Omit<SpecIssue, "severity">) =>
    issues.push({ severity: "error", ...issue });
  const elements: Record<string, SpecElement> =
    spec && typeof spec.elements === "object" && spec.elements
      ? spec.elements
      : {};

  if (!spec?.root) {
    error({
      code: "missing-root",
      message: "The spec has no root element id.",
      path: "/root",
    });
  } else if (!Object.hasOwn(elements, spec.root) && !options.partial) {
    error({
      code: "unknown-root",
      message: `The root "${spec.root}" is not an element.`,
      path: "/root",
    });
  }

  const childLists = (id: string, element: SpecElement) => {
    const lists: { slot: string; path: string; ids: unknown }[] = [];
    if (element.children !== undefined) {
      lists.push({
        slot: "default",
        path: `${elementPath(id)}/children`,
        ids: element.children,
      });
    }
    for (const [slot, ids] of Object.entries(element.slots ?? {})) {
      lists.push({
        slot,
        path: `${elementPath(id)}/slots/${escapePointerToken(slot)}`,
        ids,
      });
    }
    return lists;
  };

  const checkBindings = (
    id: string,
    path: string,
    bindings: ActionBinding[],
  ) => {
    bindings.forEach((binding, index) => {
      const at = bindings.length > 1 ? `${path}/${index}` : path;
      if (!binding || typeof binding.action !== "string") {
        error({
          code: "unknown-action",
          elementId: id,
          path: at,
          message: "An action binding needs an `action` name.",
        });
        return;
      }
      if (!catalog.action(binding.action)) {
        error({
          code: "unknown-action",
          elementId: id,
          path: `${at}/action`,
          message: `Unknown action "${binding.action}". Known: setState${Object.keys(
            catalog.actions,
          )
            .map((a) => `, ${a}`)
            .join("")}.`,
        });
        return;
      }
      for (const issue of catalog.validateParams(
        binding.action,
        binding.params,
      )) {
        error({
          code: "invalid-params",
          elementId: id,
          path: `${at}/params${issue.path === "/" ? "" : issue.path}`,
          message: `${binding.action} params ${issue.path === "/" ? "" : `${issue.path} `}${issue.message}`,
        });
      }
    });
  };

  for (const [id, element] of Object.entries(elements)) {
    const path = elementPath(id);
    if (
      !element ||
      typeof element !== "object" ||
      typeof element.type !== "string"
    ) {
      error({
        code: "invalid-element",
        elementId: id,
        path,
        message: `Element "${id}" needs a string \`type\`.`,
      });
      continue;
    }
    const definition = catalog.component(element.type);
    if (!definition) {
      error({
        code: "unknown-type",
        elementId: id,
        path: `${path}/type`,
        message: `Element "${id}" has unknown type "${element.type}". Known: ${Object.keys(catalog.components).join(", ")}.`,
      });
    } else {
      for (const issue of catalog.validateProps(element.type, element.props)) {
        error({
          code: "invalid-props",
          elementId: id,
          path: `${path}/props${issue.path === "/" ? "" : issue.path}`,
          message: `${element.type} "${id}" prop ${issue.path === "/" ? "" : `${issue.path.slice(1)} `}${issue.message}.`,
        });
      }
      const slots = definition.slots ?? [];
      for (const list of childLists(id, element)) {
        if (!slots.includes(list.slot)) {
          error({
            code:
              list.slot === "default" ? "children-not-allowed" : "unknown-slot",
            elementId: id,
            path: list.path,
            message:
              list.slot === "default"
                ? `${element.type} "${id}" takes no children.`
                : `${element.type} "${id}" has no slot "${list.slot}"${slots.length ? `; slots: ${slots.join(", ")}` : ""}.`,
          });
        }
      }
      for (const event of Object.keys(element.on ?? {})) {
        if (!(definition.events ?? []).includes(event)) {
          error({
            code: "unknown-event",
            elementId: id,
            path: `${path}/on/${escapePointerToken(event)}`,
            message: `${element.type} "${id}" does not emit "${event}"${definition.events?.length ? `; events: ${definition.events.join(", ")}` : ""}.`,
          });
        }
      }
    }

    for (const list of childLists(id, element)) {
      if (!Array.isArray(list.ids)) {
        error({
          code: "invalid-element",
          elementId: id,
          path: list.path,
          message: `Children of "${id}" must be an array of ids.`,
        });
        continue;
      }
      list.ids.forEach((childId, index) => {
        if (typeof childId !== "string") {
          error({
            code: "invalid-element",
            elementId: id,
            path: `${list.path}/${index}`,
            message: `Child ${index} of "${id}" must be an element id string.`,
          });
        } else if (!Object.hasOwn(elements, childId) && !options.partial) {
          error({
            code: "missing-child",
            elementId: id,
            path: `${list.path}/${index}`,
            message: `"${id}" lists child "${childId}", which is not an element.`,
          });
        }
      });
    }

    for (const [event, bindings] of Object.entries(element.on ?? {})) {
      checkBindings(
        id,
        `${path}/on/${escapePointerToken(event)}`,
        bindingsOf(bindings),
      );
    }
    for (const [watched, bindings] of Object.entries(element.watch ?? {})) {
      checkBindings(
        id,
        `${path}/watch/${escapePointerToken(watched)}`,
        bindingsOf(bindings),
      );
    }
    if (
      element.repeat !== undefined &&
      typeof element.repeat?.path !== "string"
    ) {
      error({
        code: "invalid-repeat",
        elementId: id,
        path: `${path}/repeat`,
        message: `"repeat" of "${id}" needs a state \`path\`.`,
      });
    }
  }

  const childIds = (element: SpecElement) =>
    childLists("", element).flatMap((list) =>
      Array.isArray(list.ids)
        ? list.ids.filter((c): c is string => typeof c === "string")
        : [],
    );

  // Depth-first search for cycles and reachability from the root.
  const state = new Map<string, "visiting" | "done">();
  const reported = new Set<string>();
  const visit = (id: string, trail: string[]) => {
    const element = elements[id];
    if (!element || typeof element !== "object") return;
    state.set(id, "visiting");
    for (const child of childIds(element)) {
      if (state.get(child) === "visiting") {
        const stack = [...trail, id];
        const loop = [...stack.slice(stack.indexOf(child)), child];
        const key = [...loop].sort().join("|");
        if (!reported.has(key)) {
          reported.add(key);
          error({
            code: "cycle",
            elementId: id,
            path: elementPath(id),
            message: `Children form a cycle: ${loop.join(" → ")}.`,
          });
        }
      } else if (!state.has(child)) {
        visit(child, [...trail, id]);
      }
    }
    state.set(id, "done");
  };
  if (spec?.root) visit(spec.root, []);
  for (const id of Object.keys(elements)) {
    if (state.has(id)) continue;
    if (!options.partial) {
      issues.push({
        code: "unreachable",
        severity: "warning",
        elementId: id,
        path: elementPath(id),
        message: `"${id}" is not reachable from the root.`,
      });
    }
    visit(id, []);
  }

  return { ok: !issues.some((issue) => issue.severity === "error"), issues };
}

/** Formats issues as model-readable repair feedback. */
export function formatSpecIssues(issues: readonly SpecIssue[]): string {
  if (issues.length === 0) return "The spec is valid.";
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const lines: string[] = [];
  if (errors.length) {
    lines.push(
      `The spec has ${errors.length} error${errors.length === 1 ? "" : "s"}. Fix them with patches on the paths shown:`,
      ...errors.map((issue) => `- ${issue.path}: ${issue.message}`),
    );
  }
  if (warnings.length) {
    lines.push(
      ...(lines.length ? [""] : []),
      "Warnings:",
      ...warnings.map((issue) => `- ${issue.path}: ${issue.message}`),
    );
  }
  return lines.join("\n");
}
