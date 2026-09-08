"use client";

import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
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
  const PreWithFallback: PreComponent = useCallbackRef((props) =>
    createElement(PreOverride, { fallbackPre: Pre, ...props }),
  );

  return useMemo(() => {
    const { SyntaxHighlighter, CodeHeader, pre, code, ...htmlComponents } =
      components ?? {};

    const codeAdapterOptions = {
      SyntaxHighlighter,
      CodeHeader,
      componentsByLanguage,
      Pre: toComponent<PreOverrideProps>(pre),
      Code: toComponent(code),
    };

    if (!shouldUseCodeAdapter(codeAdapterOptions)) {
      return { ...htmlComponents, ...(code && { code }), pre: PreWithFallback };
    }

    return {
      ...htmlComponents,
      pre: PreWithFallback,
      code: createCodeAdapter(codeAdapterOptions),
    };
  }, [components, componentsByLanguage, PreWithFallback]);
}
