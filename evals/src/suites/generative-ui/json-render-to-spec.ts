import {
  splitRepeatVisibility,
  type ActionBinding,
  type Spec as JsonSpec,
  type VisibilityCondition,
} from "@json-render/core";
import type { Spec } from "generative-frame/spec";

export function jsonRenderToSpec(spec: JsonSpec): Spec {
  const checkCondition = (condition: VisibilityCondition): void => {
    if (Array.isArray(condition)) {
      condition.forEach(checkCondition);
    } else if (typeof condition === "object" && condition !== null) {
      if ("$and" in condition) condition.$and.forEach(checkCondition);
      else if ("$or" in condition) condition.$or.forEach(checkCondition);
      else if (
        ["eq", "neq", "gt", "gte", "lt", "lte"].filter((key) =>
          Object.hasOwn(condition, key),
        ).length > 1
      ) {
        throw new Error(
          "A visibility condition has multiple comparison operators.",
        );
      }
    }
  };
  const bindings = (source: Record<string, ActionBinding | ActionBinding[]>) =>
    Object.fromEntries(
      Object.entries(source).map(([event, value]) => {
        const convert = (binding: ActionBinding) => {
          if (
            binding.confirm ||
            binding.onSuccess ||
            binding.onError ||
            binding.preventDefault
          ) {
            throw new Error(
              `Action ${binding.action} uses unsupported options.`,
            );
          }
          if (binding.action !== "setState") {
            throw new Error(
              `Action ${binding.action} cannot render in the kit.`,
            );
          }
          const { statePath, ...rest } = binding.params ?? {};
          if (typeof statePath !== "string") {
            throw new Error("setState requires a string statePath.");
          }
          return { action: "setState", params: { ...rest, path: statePath } };
        };
        return [
          event,
          Array.isArray(value) ? value.map(convert) : convert(value),
        ];
      }),
    );

  const elements: Spec["elements"] = Object.fromEntries(
    Object.entries(spec.elements).map(([key, element]) => {
      const { repeat, on, watch, ...shared } = element;
      if (element.visible !== undefined) checkCondition(element.visible);
      const repeatPath = repeat?.statePath;
      if (repeat && typeof repeatPath !== "string") {
        throw new Error(
          `Element ${key} uses an unsupported item-relative repeat.`,
        );
      }
      return [
        key,
        {
          ...shared,
          ...(typeof repeatPath === "string"
            ? {
                repeat: {
                  path: repeatPath,
                  ...(repeat?.key ? { key: repeat.key } : {}),
                },
              }
            : {}),
          ...(on ? { on: bindings(on) } : {}),
          ...(watch ? { watch: bindings(watch) } : {}),
        },
      ];
    }),
  );
  for (const [key, element] of Object.entries(spec.elements)) {
    if (!element.repeat || element.visible === undefined) continue;
    const { container, itemFilter } = splitRepeatVisibility(element.visible);
    if (itemFilter === undefined) continue;
    const target = elements[key]!;
    if (container === undefined) delete target.visible;
    else target.visible = container;
    target.children = (element.children ?? []).map((childKey, index) => {
      const child = elements[childKey]!;
      let copyKey = `${key}/${index}`;
      while (Object.hasOwn(elements, copyKey)) copyKey += "/";
      elements[copyKey] = {
        ...child,
        visible:
          child.visible === undefined
            ? itemFilter
            : { $and: [itemFilter, child.visible] },
      };
      return copyKey;
    });
  }
  return {
    root: spec.root,
    elements,
    ...(spec.state ? { state: spec.state } : {}),
  };
}
