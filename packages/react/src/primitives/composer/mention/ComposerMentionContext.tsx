"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
  type FC,
} from "react";
import { useResource } from "@assistant-ui/tap/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  Unstable_MentionAdapter,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import {
  MentionResource,
  type MentionResourceOutput,
  type SelectItemOverride,
} from "./MentionResource";

// =============================================================================
// Context — public (popover components read state + actions from here)
// =============================================================================

const MentionContext = createContext<MentionResourceOutput | null>(null);

export const useMentionContext = () => {
  const ctx = useContext(MentionContext);
  if (!ctx)
    throw new Error(
      "useMentionContext must be used within ComposerPrimitive.MentionRoot",
    );
  return ctx;
};

export const useMentionContextOptional = () => {
  return useContext(MentionContext);
};

// =============================================================================
// Internal context — ComposerInput → MentionRoot communication
// =============================================================================

type MentionInternalContextValue = {
  setCursorPosition(pos: number): void;
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

const MentionInternalContext =
  createContext<MentionInternalContextValue | null>(null);

export const useMentionInternalContext = () => {
  return useContext(MentionInternalContext);
};

// =============================================================================
// Provider Component
// =============================================================================

export namespace ComposerPrimitiveMentionRoot {
  export type Props = {
    children: ReactNode;
    adapter?: Unstable_MentionAdapter | undefined;
    /** Character(s) that trigger the mention popover. @default "@" */
    trigger?: string | undefined;
    /** Custom formatter for serializing/parsing mention directives. */
    formatter?: Unstable_DirectiveFormatter | undefined;
  };
}

export const ComposerPrimitiveMentionRoot: FC<
  ComposerPrimitiveMentionRoot.Props
> = ({
  children,
  adapter: adapterProp,
  trigger: triggerChar = "@",
  formatter: formatterProp,
}) => {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const formatter = formatterProp ?? unstable_defaultDirectiveFormatter;

  // ---------------------------------------------------------------------------
  // Runtime adapter (subscribe to state changes instead of useAuiState to avoid
  // infinite loop — getModelContext() returns a new object on every call)
  // ---------------------------------------------------------------------------

  const getRuntimeAdapter = useCallback(() => {
    try {
      const runtime = aui.composer().__internal_getRuntime?.();
      return (runtime as any)?._core?.getState()?.getMentionAdapter?.();
    } catch {
      return undefined;
    }
  }, [aui]);
  const [runtimeAdapter, setRuntimeAdapter] = useState(getRuntimeAdapter);
  useEffect(() => {
    return aui.subscribe(() => {
      setRuntimeAdapter((prev: unknown) => {
        const next = getRuntimeAdapter();
        return prev === next ? prev : next;
      });
    });
  }, [aui, getRuntimeAdapter]);
  const adapter = adapterProp ?? runtimeAdapter;

  // ---------------------------------------------------------------------------
  // Mention resource (all state + logic managed via tap primitives)
  // ---------------------------------------------------------------------------

  const mention = useResource(
    MentionResource({ adapter, text, triggerChar, formatter, aui }),
  );

  // ---------------------------------------------------------------------------
  // Internal context (stable — methods come from tapEffectEvent)
  // ---------------------------------------------------------------------------

  const internalContextValue = useMemo<MentionInternalContextValue>(
    () => ({
      setCursorPosition: mention.setCursorPosition,
      registerSelectItemOverride: mention.registerSelectItemOverride,
    }),
    [mention.setCursorPosition, mention.registerSelectItemOverride],
  );

  return (
    <MentionContext.Provider value={mention}>
      <MentionInternalContext.Provider value={internalContextValue}>
        {children}
      </MentionInternalContext.Provider>
    </MentionContext.Provider>
  );
};

ComposerPrimitiveMentionRoot.displayName = "ComposerPrimitive.MentionRoot";
