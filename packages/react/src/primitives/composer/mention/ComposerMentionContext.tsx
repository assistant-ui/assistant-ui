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
import { useAui } from "@assistant-ui/store";
import type {
  Unstable_MentionAdapter,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { ComposerPrimitiveTriggerPopoverRoot } from "../trigger/TriggerPopoverContext";
import type {
  TriggerPopoverResourceOutput,
  SelectItemOverride,
  OnSelectBehavior,
} from "../trigger/TriggerPopoverResource";

type MentionResourceOutput = TriggerPopoverResourceOutput & {
  readonly formatter: Unstable_DirectiveFormatter;
};

// =============================================================================
// Context — public (provides formatter on top of TriggerPopoverContext)
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
// Internal context — only registerSelectItemOverride for Lexical integration
// =============================================================================

type MentionInternalContextValue = {
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

const MentionInternalContext =
  createContext<MentionInternalContextValue | null>(null);

export const useMentionInternalContext = () => {
  return useContext(MentionInternalContext);
};

// =============================================================================
// Provider Component — delegates to TriggerPopoverRoot internally
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
  // onSelect behavior for mentions: insert directive text
  // ---------------------------------------------------------------------------

  const onSelect = useMemo<OnSelectBehavior>(
    () => ({ type: "insertDirective", formatter }),
    [formatter],
  );

  // ---------------------------------------------------------------------------
  // MentionContext — provides formatter + delegates state to TriggerPopoverContext
  // We use useAuiState to read trigger popover state via the inner context.
  // For backward compat, MentionContext wraps TriggerPopoverContext output.
  // ---------------------------------------------------------------------------

  return (
    <ComposerPrimitiveTriggerPopoverRoot
      adapter={adapter}
      trigger={triggerChar}
      onSelect={onSelect}
    >
      <MentionContextBridge formatter={formatter}>
        {children}
      </MentionContextBridge>
    </ComposerPrimitiveTriggerPopoverRoot>
  );
};

ComposerPrimitiveMentionRoot.displayName = "ComposerPrimitive.MentionRoot";

// =============================================================================
// Bridge — reads TriggerPopoverContext, wraps it as MentionContext
// =============================================================================

import { useTriggerPopoverContext } from "../trigger/TriggerPopoverContext";

const MentionContextBridge: FC<{
  formatter: Unstable_DirectiveFormatter;
  children: ReactNode;
}> = ({ formatter, children }) => {
  const triggerCtx = useTriggerPopoverContext();

  const mentionValue = useMemo<MentionResourceOutput>(
    () => ({ ...triggerCtx, formatter }),
    [triggerCtx, formatter],
  );

  const internalContextValue = useMemo<MentionInternalContextValue>(
    () => ({
      registerSelectItemOverride: triggerCtx.registerSelectItemOverride,
    }),
    [triggerCtx.registerSelectItemOverride],
  );

  return (
    <MentionContext.Provider value={mentionValue}>
      <MentionInternalContext.Provider value={internalContextValue}>
        {children}
      </MentionInternalContext.Provider>
    </MentionContext.Provider>
  );
};
