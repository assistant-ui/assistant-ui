"use client";

import { useCallbackRef } from "../useCallbackRef";
import { useStableProps } from "../useStableProps";
import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  createElement,
  useMemo,
} from "react";
import type { StreamdownProps } from "streamdown";
import type { Element } from "hast";
import {
  CodeAdapter,
  type CodeAdapterOptions,
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

interface AdaptedComponents {
  components: NonNullable<StreamdownProps["components"]>;
  codeAdapter: CodeAdapterOptions;
}

type CodeProps = ComponentPropsWithoutRef<"code"> & {
  node?: Element | undefined;
};

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
 * component type remounts every code block on every streamed token. The code
 * adapter options travel through `CodeAdapterContext` instead, and their
 * identity follows the highlighter, header and language entries only, so an
 * inline `pre` or `code` never re-renders settled blocks.
 */
export function useAdaptedComponents({
  components,
  componentsByLanguage,
}: UseAdaptedComponentsOptions): AdaptedComponents {
  const SyntaxHighlighter = components?.SyntaxHighlighter;
  const CodeHeader = components?.CodeHeader;
  const Pre = toComponent<PreOverrideProps>(components?.pre);
  const Code = toComponent(components?.code);

  const PreWithFallback: PreComponent = useCallbackRef((props) =>
    createElement(PreOverride, { fallbackPre: Pre, ...props }),
  );
  const StablePre: PreComponent = useCallbackRef((props) =>
    Pre ? createElement(Pre, props) : null,
  );
  const StableCode: ComponentType<CodeProps> = useCallbackRef((props) =>
    Code ? createElement(Code, props) : null,
  );
  const adaptedPre = Pre ? StablePre : undefined;
  const adaptedCode = Code ? StableCode : undefined;
  const stableComponentsByLanguage = useStableProps(componentsByLanguage);

  const codeAdapter = useMemo<CodeAdapterOptions>(
    () => ({
      SyntaxHighlighter,
      CodeHeader,
      componentsByLanguage: stableComponentsByLanguage,
      Pre: adaptedPre,
      Code: adaptedCode,
    }),
    [
      SyntaxHighlighter,
      CodeHeader,
      stableComponentsByLanguage,
      adaptedPre,
      adaptedCode,
    ],
  );

  return useMemo(() => {
    const {
      SyntaxHighlighter: _,
      CodeHeader: __,
      pre: ___,
      code,
      ...htmlComponents
    } = components ?? {};

    const adapted = shouldUseCodeAdapter(codeAdapter)
      ? { ...htmlComponents, pre: PreWithFallback, code: CodeAdapter }
      : { ...htmlComponents, ...(code && { code }), pre: PreWithFallback };

    return { components: adapted, codeAdapter };
  }, [components, codeAdapter, PreWithFallback]);
}
