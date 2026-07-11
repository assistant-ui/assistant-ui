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
 * input. Used by trigger popover declarations to handle popover navigation
 * without ComposerInput knowing about specific triggers.
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

/** Options for registering a plugin. */
export type ComposerInputPluginRegisterOptions = {
  /**
   * Relative priority. Plugins with higher priority receive events first.
   * @default 0
   */
  priority?: number;
};

/**
 * ARIA descriptor of the popup currently coupled to the composer input.
 * Consumed by the input so it can advertise the combobox relationship per the
 * WAI-ARIA editable combobox pattern.
 */
export type ComposerActiveDescendant = {
  popoverId: string;
  highlightedItemId: string | undefined;
};

// Ref-based registry: plugins are read imperatively at event time, so register/unregister does not trigger re-renders.
export type ComposerInputPluginRegistry = {
  register(
    plugin: ComposerInputPlugin,
    opts?: ComposerInputPluginRegisterOptions,
  ): () => void;
  getPlugins(): readonly ComposerInputPlugin[];
  /**
   * Publish or clear the active descendant. Key-scoped: each publisher owns
   * its key; a clear from a non-owning key is ignored.
   */
  setActiveDescendant(
    key: string,
    value: ComposerActiveDescendant | null,
  ): void;
  getActiveDescendant(): ComposerActiveDescendant | null;
  subscribeActiveDescendant(listener: () => void): () => void;
  /** Register the composer input's focus callback. */
  registerInput(input: { focus(): void }): () => void;
  /** Focus the registered composer input, if any. */
  requestFocus(): void;
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
  const pluginsRef = useRef<Map<ComposerInputPlugin, number>>(new Map());
  const snapshotRef = useRef<readonly ComposerInputPlugin[]>([]);

  const refreshSnapshot = useCallback(() => {
    const entries = Array.from(pluginsRef.current.entries());
    // Sort by priority descending; stable insertion order for equal priorities.
    entries.sort((a, b) => b[1] - a[1]);
    snapshotRef.current = entries.map(([plugin]) => plugin);
  }, []);

  const register = useCallback(
    (
      plugin: ComposerInputPlugin,
      opts?: ComposerInputPluginRegisterOptions,
    ) => {
      const priority = opts?.priority ?? 0;
      pluginsRef.current.set(plugin, priority);
      refreshSnapshot();
      return () => {
        pluginsRef.current.delete(plugin);
        refreshSnapshot();
      };
    },
    [refreshSnapshot],
  );

  const getPlugins = useCallback(
    (): readonly ComposerInputPlugin[] => snapshotRef.current,
    [],
  );

  const activeDescendantRef = useRef<ComposerActiveDescendant | null>(null);
  const activeDescendantKeyRef = useRef<string | null>(null);
  const ariaListenersRef = useRef<Set<() => void>>(new Set());

  const subscribeActiveDescendant = useCallback((listener: () => void) => {
    ariaListenersRef.current.add(listener);
    return () => {
      ariaListenersRef.current.delete(listener);
    };
  }, []);

  const setActiveDescendant = useCallback(
    (key: string, value: ComposerActiveDescendant | null) => {
      if (value === null) {
        if (activeDescendantKeyRef.current !== key) return;
        activeDescendantRef.current = null;
        activeDescendantKeyRef.current = null;
      } else {
        const prev = activeDescendantRef.current;
        if (
          activeDescendantKeyRef.current === key &&
          prev !== null &&
          prev.popoverId === value.popoverId &&
          prev.highlightedItemId === value.highlightedItemId
        ) {
          return;
        }
        activeDescendantRef.current = value;
        activeDescendantKeyRef.current = key;
      }
      for (const listener of ariaListenersRef.current) listener();
    },
    [],
  );

  const getActiveDescendant = useCallback(
    (): ComposerActiveDescendant | null => activeDescendantRef.current,
    [],
  );

  const inputsRef = useRef<Set<{ focus(): void }>>(new Set());

  const registerInput = useCallback((input: { focus(): void }) => {
    inputsRef.current.add(input);
    return () => {
      inputsRef.current.delete(input);
    };
  }, []);

  const requestFocus = useCallback(() => {
    const inputs = Array.from(inputsRef.current);
    inputs[inputs.length - 1]?.focus();
  }, []);

  const registry = useMemo<ComposerInputPluginRegistry>(
    () => ({
      register,
      getPlugins,
      setActiveDescendant,
      getActiveDescendant,
      subscribeActiveDescendant,
      registerInput,
      requestFocus,
    }),
    [
      register,
      getPlugins,
      setActiveDescendant,
      getActiveDescendant,
      subscribeActiveDescendant,
      registerInput,
      requestFocus,
    ],
  );

  return (
    <ComposerInputPluginRegistryContext.Provider value={registry}>
      {children}
    </ComposerInputPluginRegistryContext.Provider>
  );
};
