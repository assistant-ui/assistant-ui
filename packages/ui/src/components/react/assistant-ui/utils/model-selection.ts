"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ModelSelectorEffortOption = {
  id: string;
  name: string;
};

export const DEFAULT_EFFORT_OPTIONS: readonly ModelSelectorEffortOption[] = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Med" },
  { id: "high", name: "High" },
];

export type ModelOption = {
  id: string;
  name: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Extra terms matched by ModelSelector.Search, in addition to id and name. */
  keywords?: readonly string[];
  /**
   * Reasoning effort levels the model supports. Pass `true` for the default
   * low/medium/high levels, or a custom list. Omit for models without
   * configurable reasoning.
   */
  efforts?: boolean | readonly ModelSelectorEffortOption[];
};

export function getModelEfforts(
  model: ModelOption | undefined,
): readonly ModelSelectorEffortOption[] | undefined {
  if (!model?.efforts) return undefined;
  return model.efforts === true ? DEFAULT_EFFORT_OPTIONS : model.efforts;
}

export function resolveEffort(
  efforts: readonly ModelSelectorEffortOption[] | undefined,
  effort: string | undefined,
): string | undefined {
  if (effort === undefined) return undefined;
  return efforts?.some((e) => e.id === effort) ? effort : undefined;
}

/**
 * Returns the effort id if the given model supports it, otherwise undefined.
 * Effort selection is kept sticky across model switches; this resolves what
 * actually applies to the current model.
 */
export function resolveModelEffort(
  models: readonly ModelOption[],
  modelId: string | undefined,
  effort: string | undefined,
): string | undefined {
  return resolveEffort(
    getModelEfforts(models.find((m) => m.id === modelId)),
    effort,
  );
}

export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: {
  prop: T | undefined;
  defaultProp: T | undefined;
  onChange: ((next: T) => void) | undefined;
}) {
  const [internal, setInternal] = useState(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : internal;
  // Read onChange through a ref so inline callbacks don't recreate the setter
  // (and with it the memoized context value) every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );
  return [value, setValue] as const;
}

type ModelSelectorContextValue = {
  models: readonly ModelOption[];
  value: string | undefined;
  setValue: (value: string) => void;
  /** The model matching `value`, derived once for all sub-components. */
  selectedModel: ModelOption | undefined;
  /** The selected model's effort levels, undefined when not configurable. */
  efforts: readonly ModelSelectorEffortOption[] | undefined;
  /** Effort resolved against the selected model's supported levels. */
  effort: string | undefined;
  setEffort: (effort: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const ModelSelectorContext =
  createContext<ModelSelectorContextValue | null>(null);

export function useModelSelectorContext() {
  const ctx = useContext(ModelSelectorContext);
  if (!ctx) {
    throw new Error(
      "ModelSelector sub-components must be used within ModelSelector.Root",
    );
  }
  return ctx;
}

/**
 * The selected model's effort levels and the active selection. Use it to build
 * a custom effort UI inside ModelSelector.Content (e.g. a slider or a shadcn
 * DropdownMenu) when the built-in ModelSelector.Effort layout doesn't fit.
 * `efforts` is undefined for models without configurable reasoning.
 */
export function useModelSelectorEfforts(): {
  efforts: readonly ModelSelectorEffortOption[] | undefined;
  effort: string | undefined;
  setEffort: (effort: string) => void;
} {
  const { efforts, effort, setEffort } = useModelSelectorContext();
  return { efforts, effort, setEffort };
}

// The popover re-evaluates collision flipping whenever the popup resizes, so
// filtering the list down flips the popup back to the preferred side
// mid-interaction. Base UI only exposes lazy flipping on the Combobox
// positioner, so adopt the side the popup first flips to as the preferred side
// for the rest of the open. Adopting every change can alternate between sides
// without end: after a preference change the popup can render on the opposite
// side even when both sides fit.
//
// A force-mounted popup keeps its node and position while closed. Pass `open`
// and the `preferred` side for one, so the side resets on close and a reopen
// adopts a side the popup already flipped to.
export function useLazyFlipSide<TSide extends string>(
  open = true,
  preferred?: TSide,
): {
  side: TSide | undefined;
  popupRef: (node: HTMLDivElement | null) => void;
} {
  const [side, setSide] = useState<TSide | undefined>();
  const observerRef = useRef<MutationObserver | null>(null);
  const preferredRef = useRef(preferred);
  preferredRef.current = preferred;
  const popupRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || !open) {
        setSide(undefined);
        return;
      }
      const current = node.getAttribute("data-side");
      const hasFlipped =
        preferredRef.current !== undefined &&
        current !== null &&
        current !== preferredRef.current;
      if (hasFlipped) {
        setSide(current as TSide);
        return;
      }
      const observer = new MutationObserver(() => {
        const rendered = node.getAttribute("data-side");
        if (!rendered) return;
        observer.disconnect();
        setSide(rendered as TSide);
      });
      observer.observe(node, {
        attributes: true,
        attributeFilter: ["data-side"],
      });
      observerRef.current = observer;
    },
    [open],
  );
  return { side, popupRef };
}
