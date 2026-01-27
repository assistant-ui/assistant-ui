"use client";

import { useMemo } from "react";
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
 * - SyntaxHighlighter → custom code component
 * - CodeHeader → custom code component
 * - componentsByLanguage → custom code component with language dispatch
 * - PreOverride → context-based inline/block code detection
 */
export function useAdaptedComponents({
  components,
  componentsByLanguage,
}: UseAdaptedComponentsOptions): StreamdownProps["components"] {
  return useMemo(() => {
    if (!components && !componentsByLanguage) {
      return undefined;
    }

    const { SyntaxHighlighter, CodeHeader, ...htmlComponents } =
      components ?? {};

    const codeAdapterOptions = {
      SyntaxHighlighter,
      CodeHeader,
      componentsByLanguage,
    };

    // If user provided custom code-related components, create adapter
    if (shouldUseCodeAdapter(codeAdapterOptions)) {
      const AdaptedCode = createCodeAdapter(codeAdapterOptions);

      return {
        ...htmlComponents,
        pre: PreOverride,
        code: (props) => {
          const result = AdaptedCode(props);
          // If adapter returns null, return undefined to let streamdown handle it
          if (result === null) {
            return undefined;
          }
          return result;
        },
      };
    }

    // No custom code components, just pass through HTML components
    return htmlComponents as StreamdownProps["components"];
  }, [components, componentsByLanguage]);
}
