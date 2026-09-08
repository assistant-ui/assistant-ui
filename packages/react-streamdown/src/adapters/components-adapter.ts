"use client";

import { type ComponentProps, createElement, useMemo } from "react";
import type { StreamdownProps } from "streamdown";
import { createCodeAdapter, shouldUseCodeAdapter } from "./code-adapter";
import { PreOverride } from "./PreOverride";
import type { ComponentsByLanguage, StreamdownTextComponents } from "../types";

interface UseAdaptedComponentsOptions {
  components?: StreamdownTextComponents | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
}

/**
 * Hook that adapts assistant-ui component API to streamdown's component API.
 *
 * Handles:
 * - SyntaxHighlighter -> custom code component
 * - CodeHeader -> custom code component
 * - componentsByLanguage -> custom code component with language dispatch
 * - PreOverride -> streamdown-style data-block marking plus pre props context
 */
export function useAdaptedComponents({
  components,
  componentsByLanguage,
}: UseAdaptedComponentsOptions): StreamdownProps["components"] {
  return useMemo(() => {
    const { SyntaxHighlighter, CodeHeader, ...htmlComponents } =
      components ?? {};

    const codeAdapterOptions = {
      SyntaxHighlighter,
      CodeHeader,
      componentsByLanguage,
    };

    const baseComponents = {
      pre: htmlComponents.pre
        ? (props: ComponentProps<typeof PreOverride>) =>
            createElement(PreOverride, {
              ...props,
              fallbackPre: htmlComponents.pre,
            })
        : PreOverride,
    };

    if (!shouldUseCodeAdapter(codeAdapterOptions)) {
      return { ...htmlComponents, ...baseComponents };
    }

    const AdaptedCode = createCodeAdapter(codeAdapterOptions);

    return {
      ...htmlComponents,
      ...baseComponents,
      code: AdaptedCode,
    };
  }, [components, componentsByLanguage]);
}
