"use client";

import { memo, useMemo } from "react";
import type { StreamdownProps } from "streamdown";
import {
  compareCodeProps,
  createCodeAdapter,
  defaultStreamdownCode,
  shouldUseCodeAdapter,
} from "./code-adapter";
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
    const {
      SyntaxHighlighter,
      CodeHeader,
      code: UserCode,
      ...htmlComponents
    } = components ?? {};

    const codeAdapterOptions = {
      SyntaxHighlighter,
      CodeHeader,
      componentsByLanguage,
    };

    const code = shouldUseCodeAdapter(codeAdapterOptions)
      ? createCodeAdapter(codeAdapterOptions)
      : typeof UserCode === "function"
        ? memo(UserCode, compareCodeProps)
        : (UserCode ?? defaultStreamdownCode);

    return {
      ...htmlComponents,
      pre: PreOverride,
      code,
    };
  }, [components, componentsByLanguage]);
}
