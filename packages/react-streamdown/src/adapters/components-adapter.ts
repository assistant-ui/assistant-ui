"use client";

import { type ComponentType, createElement, useMemo } from "react";
import type { StreamdownProps } from "streamdown";
import { createCodeAdapter, shouldUseCodeAdapter } from "./code-adapter";
import {
  type PreComponent,
  type PreOverrideProps,
  PreOverride,
} from "./PreOverride";
import type { ComponentsByLanguage, StreamdownTextComponents } from "../types";

interface UseAdaptedComponentsOptions {
  components?: StreamdownTextComponents | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
}

const intrinsicComponents = new Map<string, ComponentType<never>>();

function toComponent<P extends { node?: unknown }>(
  component: ComponentType<P> | string | undefined,
): ComponentType<P> | undefined {
  if (typeof component !== "string") return component;
  let wrapped = intrinsicComponents.get(component);
  if (!wrapped) {
    wrapped = function IntrinsicElement({ node: _, ...props }: P) {
      return createElement(component, props);
    };
    intrinsicComponents.set(component, wrapped);
  }
  return wrapped as ComponentType<P>;
}

/**
 * Hook that adapts assistant-ui component API to streamdown's component API.
 *
 * Handles:
 * - SyntaxHighlighter -> custom code component
 * - CodeHeader -> custom code component
 * - componentsByLanguage -> custom code component with language dispatch
 * - pre/code -> the Pre/Code the block path and the highlighter receive
 * - PreOverride -> streamdown-style data-block marking plus pre props context
 */
export function useAdaptedComponents({
  components,
  componentsByLanguage,
}: UseAdaptedComponentsOptions): NonNullable<StreamdownProps["components"]> {
  const Pre = toComponent<PreOverrideProps>(components?.pre);
  const PreWithFallback: PreComponent = useMemo(
    () =>
      function PreWithFallback(props: PreOverrideProps) {
        return createElement(PreOverride, { fallbackPre: Pre, ...props });
      },
    [Pre],
  );

  return useMemo(() => {
    const { SyntaxHighlighter, CodeHeader, pre, code, ...htmlComponents } =
      components ?? {};

    const Code = toComponent(code);
    const codeAdapterOptions = {
      SyntaxHighlighter,
      CodeHeader,
      componentsByLanguage,
      Pre: toComponent<PreOverrideProps>(pre),
      Code,
    };

    if (!shouldUseCodeAdapter(codeAdapterOptions) && !(Pre && Code)) {
      return { ...htmlComponents, ...(code && { code }), pre: PreWithFallback };
    }

    return {
      ...htmlComponents,
      pre: PreWithFallback,
      code: createCodeAdapter(codeAdapterOptions),
    };
  }, [components, componentsByLanguage, Pre, PreWithFallback]);
}
