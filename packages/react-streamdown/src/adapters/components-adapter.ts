"use client";

import { useCallbackRef } from "../useCallbackRef";
import { type ComponentType, createElement, useMemo } from "react";
import type { StreamdownProps } from "streamdown";
import {
  CodeAdapter,
  type CodeAdapterProps,
  shouldUseCodeAdapter,
} from "./code-adapter";
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
 *
 * The `pre` and `code` entries keep a stable component identity, because the
 * documented usage of `components` is an inline object literal and a fresh
 * component type remounts every code block on every streamed token.
 */
export function useAdaptedComponents({
  components,
  componentsByLanguage,
}: UseAdaptedComponentsOptions): NonNullable<StreamdownProps["components"]> {
  const SyntaxHighlighter = components?.SyntaxHighlighter;
  const CodeHeader = components?.CodeHeader;
  const Pre = toComponent<PreOverrideProps>(components?.pre);
  const Code = toComponent(components?.code);

  const PreWithFallback: PreComponent = useCallbackRef((props) =>
    createElement(PreOverride, { fallbackPre: Pre, ...props }),
  );

  const adapter = useMemo(
    () => ({ SyntaxHighlighter, CodeHeader, componentsByLanguage, Pre, Code }),
    [SyntaxHighlighter, CodeHeader, componentsByLanguage, Pre, Code],
  );

  const CodeWithAdapter = useCallbackRef(
    (props: Omit<CodeAdapterProps, "adapter">) =>
      createElement(CodeAdapter, { adapter, ...props }),
  );

  return useMemo(() => {
    const {
      SyntaxHighlighter: _,
      CodeHeader: __,
      pre: ___,
      code,
      ...htmlComponents
    } = components ?? {};

    if (!shouldUseCodeAdapter(adapter)) {
      return { ...htmlComponents, ...(code && { code }), pre: PreWithFallback };
    }

    return {
      ...htmlComponents,
      pre: PreWithFallback,
      code: CodeWithAdapter,
    };
  }, [components, adapter, PreWithFallback, CodeWithAdapter]);
}
