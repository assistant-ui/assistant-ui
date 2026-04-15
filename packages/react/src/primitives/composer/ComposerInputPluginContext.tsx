"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
  type FC,
} from "react";

/**
 * A plugin that intercepts keyboard events and cursor changes in the composer
 * input. Used by trigger roots (MentionRoot, SlashCommandRoot, etc.) to handle
 * popover navigation without ComposerInput knowing about specific triggers.
 */
export type ComposerInputPlugin = {
  /** Handle a key event. Return true if consumed (stops propagation to other plugins and default behavior). */
  handleKeyDown(e: {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    readonly nativeEvent?: { isComposing?: boolean };
    preventDefault(): void;
  }): boolean;

  /** Called on every cursor position change (selection change / text change). */
  setCursorPosition(pos: number): void;
};

// Ref-based registry: plugins are read imperatively at event time, so register/unregister does not trigger re-renders.
export type ComposerInputPluginRegistry = {
  register(plugin: ComposerInputPlugin): () => void;
  getPlugins(): readonly ComposerInputPlugin[];
};

const ComposerInputPluginRegistryContext =
  createContext<ComposerInputPluginRegistry | null>(null);

export const useComposerInputPluginRegistry =
  (): ComposerInputPluginRegistry => {
    const ctx = useContext(ComposerInputPluginRegistryContext);
    if (!ctx)
      throw new Error(
        "useComposerInputPluginRegistry must be used within a ComposerInputPluginProvider",
      );
    return ctx;
  };

export const useComposerInputPluginRegistryOptional =
  (): ComposerInputPluginRegistry | null => {
    return useContext(ComposerInputPluginRegistryContext);
  };

export const ComposerInputPluginProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const pluginsRef = useRef<Set<ComposerInputPlugin>>(new Set());
  const snapshotRef = useRef<readonly ComposerInputPlugin[]>([]);

  const register = useCallback((plugin: ComposerInputPlugin) => {
    pluginsRef.current.add(plugin);
    snapshotRef.current = Array.from(pluginsRef.current);
    return () => {
      pluginsRef.current.delete(plugin);
      snapshotRef.current = Array.from(pluginsRef.current);
    };
  }, []);

  const getPlugins = useCallback(
    (): readonly ComposerInputPlugin[] => snapshotRef.current,
    [],
  );

  const registry = useMemo<ComposerInputPluginRegistry>(
    () => ({ register, getPlugins }),
    [register, getPlugins],
  );

  return (
    <ComposerInputPluginRegistryContext.Provider value={registry}>
      {children}
    </ComposerInputPluginRegistryContext.Provider>
  );
};
