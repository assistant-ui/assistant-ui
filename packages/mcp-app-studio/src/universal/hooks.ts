"use client";

import { useEffect, useState, useCallback } from "react";
import { useUniversalBridge } from "./provider";
import type {
  HostContext,
  ToolResult,
  DisplayMode,
  ContentBlock,
} from "../core/types";
import {
  hasFeature,
  type HostCapabilities,
  type FeatureKey,
} from "../core/capabilities";

/**
 * Returns the current host context with environment information.
 * Updates automatically when the host context changes.
 *
 * @returns The host context object, or null if not connected
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const context = useHostContext();
 *
 *   if (!context) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Theme: {context.theme}</p>
 *       <p>Locale: {context.locale}</p>
 *       <p>Display mode: {context.displayMode}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHostContext(): HostContext | null {
  const bridge = useUniversalBridge();
  const [context, setContext] = useState<HostContext | null>(
    bridge?.getHostContext() ?? null,
  );

  useEffect(() => {
    if (!bridge) return;
    return bridge.onHostContextChanged((ctx) => {
      setContext((prev: HostContext | null) =>
        // On first context update, ctx should contain full context from getHostContext().
        // On subsequent updates, merge partial updates with existing state.
        prev ? { ...prev, ...ctx } : (ctx as HostContext),
      );
    });
  }, [bridge]);

  return context;
}

/**
 * Returns the current color theme ("light" or "dark").
 * Defaults to "light" if theme is not available.
 *
 * @returns Current theme
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const theme = useTheme();
 *
 *   return (
 *     <div className={theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): "light" | "dark" {
  const bridge = useUniversalBridge();
  const [theme, setTheme] = useState<"light" | "dark">(
    () => bridge?.getHostContext()?.theme ?? "light",
  );

  useEffect(() => {
    if (!bridge) return;
    return bridge.onHostContextChanged((ctx) => {
      if (ctx.theme !== undefined) {
        setTheme(ctx.theme);
      }
    });
  }, [bridge]);

  return theme;
}

/**
 * Returns the capabilities supported by the current host platform.
 * Use this to conditionally enable features based on platform support.
 *
 * @returns Host capabilities object, or null if not connected
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const capabilities = useCapabilities();
 *
 *   return (
 *     <div>
 *       {capabilities?.widgetState && (
 *         <button>Save State (ChatGPT only)</button>
 *       )}
 *       {capabilities?.modelContext && (
 *         <button>Update Context (MCP only)</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCapabilities(): HostCapabilities | null {
  const bridge = useUniversalBridge();
  return bridge?.capabilities ?? null;
}

/**
 * Returns the input arguments passed to the tool that invoked this widget.
 * Generic type parameter allows you to specify the expected input shape.
 *
 * @typeParam T - The expected shape of the tool input
 * @returns Tool input object, or null if not yet received
 *
 * @example
 * ```tsx
 * interface SearchInput {
 *   query: string;
 *   limit?: number;
 * }
 *
 * function SearchWidget() {
 *   const input = useToolInput<SearchInput>();
 *
 *   if (!input) return <div>Waiting for search query...</div>;
 *
 *   return <SearchResults query={input.query} limit={input.limit ?? 10} />;
 * }
 * ```
 */
export function useToolInput<T = Record<string, unknown>>(): T | null {
  const bridge = useUniversalBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    if (!bridge) return;
    return bridge.onToolInput((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

/**
 * Returns partial tool input as it's being streamed (host-dependent).
 * Useful for showing real-time feedback as the user types.
 *
 * **Host support:** MCP Apps hosts that stream partial input. Returns null otherwise.
 *
 * @typeParam T - The expected shape of the tool input
 * @returns Partial tool input, or null
 *
 * @example
 * ```tsx
 * function StreamingInput() {
 *   const partial = useToolInputPartial<{ query: string }>();
 *   const final = useToolInput<{ query: string }>();
 *
 *   // Show partial input with typing indicator
 *   if (partial && !final) {
 *     return <div className="opacity-50">{partial.query}...</div>;
 *   }
 *
 *   return <div>{final?.query}</div>;
 * }
 * ```
 */
export function useToolInputPartial<T = Record<string, unknown>>(): T | null {
  const bridge = useUniversalBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    if (!bridge?.onToolInputPartial) return;
    return bridge.onToolInputPartial((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

/**
 * Returns the result from a tool call made by the widget.
 * Updates when tool calls complete.
 *
 * @returns Tool result object, or null if no result yet
 *
 * @example
 * ```tsx
 * function ToolResultDisplay() {
 *   const result = useToolResult();
 *
 *   if (!result) return null;
 *
 *   if (result.isError) {
 *     return <div className="text-red-500">Error: {result.content?.[0]?.text}</div>;
 *   }
 *
 *   return <div>{JSON.stringify(result.structuredContent)}</div>;
 * }
 * ```
 */
export function useToolResult(): ToolResult | null {
  const bridge = useUniversalBridge();
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    if (!bridge) return;
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

/**
 * Returns the current display mode and a function to request a mode change.
 * Display mode controls how the widget is presented (inline, fullscreen, or pip).
 *
 * @returns Tuple of [currentMode, setMode]
 *
 * @example
 * ```tsx
 * function ExpandableWidget() {
 *   const [mode, setMode] = useDisplayMode();
 *
 *   return (
 *     <div>
 *       <p>Current mode: {mode}</p>
 *       {mode === 'inline' && (
 *         <button onClick={() => setMode('fullscreen')}>
 *           Expand to Fullscreen
 *         </button>
 *       )}
 *       {mode === 'fullscreen' && (
 *         <button onClick={() => setMode('inline')}>
 *           Collapse
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDisplayMode(): [
  DisplayMode,
  (mode: DisplayMode) => Promise<void>,
] {
  const bridge = useUniversalBridge();
  const [mode, setModeState] = useState<DisplayMode>(
    () => bridge?.getHostContext()?.displayMode ?? "inline",
  );

  useEffect(() => {
    if (!bridge) return;
    return bridge.onHostContextChanged((ctx) => {
      if (ctx.displayMode !== undefined) {
        setModeState(ctx.displayMode);
      }
    });
  }, [bridge]);

  const setMode = useCallback(
    async (newMode: DisplayMode) => {
      if (!bridge) return;
      await bridge.requestDisplayMode(newMode);
    },
    [bridge],
  );

  return [mode, setMode];
}

/**
 * Returns a function to call tools registered with the host.
 * Tools allow your widget to perform actions and get data from the AI.
 *
 * @returns Async function to call tools
 * @throws Error if bridge is not connected
 *
 * @example
 * ```tsx
 * function SearchWidget() {
 *   const callTool = useCallTool();
 *   const [results, setResults] = useState(null);
 *   const [loading, setLoading] = useState(false);
 *
 *   const handleSearch = async (query: string) => {
 *     setLoading(true);
 *     try {
 *       const result = await callTool('search', { query, limit: 10 });
 *       if (result.isError) {
 *         console.error('Search failed');
 *       } else {
 *         setResults(result.structuredContent);
 *       }
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return <SearchUI onSearch={handleSearch} results={results} loading={loading} />;
 * }
 * ```
 */
export function useCallTool() {
  const bridge = useUniversalBridge();
  return useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<ToolResult> => {
      if (!bridge) {
        throw new Error(
          "Bridge not available. Make sure your component is wrapped with <UniversalProvider>.",
        );
      }
      return bridge.callTool(name, args);
    },
    [bridge],
  );
}

/**
 * Returns a function to open links in the user's browser.
 * This is the recommended way to open external URLs from your widget.
 *
 * @returns Async function to open links
 * @throws Error if bridge is not connected
 *
 * @example
 * ```tsx
 * function LinkButton({ url, label }: { url: string; label: string }) {
 *   const openLink = useOpenLink();
 *
 *   return (
 *     <button onClick={() => openLink(url)}>
 *       {label} ↗
 *     </button>
 *   );
 * }
 * ```
 */
export function useOpenLink() {
  const bridge = useUniversalBridge();
  return useCallback(
    async (url: string): Promise<void> => {
      if (!bridge) {
        throw new Error(
          "Bridge not available. Make sure your component is wrapped with <UniversalProvider>.",
        );
      }
      return bridge.openLink(url);
    },
    [bridge],
  );
}

/**
 * Returns a function to send a message to the conversation.
 * Useful for suggesting follow-up prompts or triggering new interactions.
 *
 * @returns Async function to send messages
 * @throws Error if bridge is not connected or sendMessage not supported
 *
 * @example
 * ```tsx
 * function SuggestionChips() {
 *   const sendMessage = useSendMessage();
 *
 *   const suggestions = ['Tell me more', 'Show examples', 'Explain in detail'];
 *
 *   return (
 *     <div className="flex gap-2">
 *       {suggestions.map(text => (
 *         <button key={text} onClick={() => sendMessage(text)}>
 *           {text}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSendMessage() {
  const bridge = useUniversalBridge();
  return useCallback(
    async (text: string): Promise<void> => {
      if (!bridge?.sendMessage) {
        throw new Error(
          "sendMessage not available. This feature may not be supported on the current platform.",
        );
      }
      return bridge.sendMessage({
        role: "user",
        content: [{ type: "text", text }],
      });
    },
    [bridge],
  );
}

/**
 * Returns a function to update the model-visible context.
 * Use this to provide additional context to the AI model.
 *
 * @returns Async function to update model context
 *
 * @example
 * ```tsx
 * function DataViewer({ data }: { data: object }) {
 *   const updateContext = useUpdateModelContext();
 *
 *   useEffect(() => {
 *     updateContext({ structuredContent: { currentData: data } });
 *   }, [data, updateContext]);
 *
 *   return <pre>{JSON.stringify(data, null, 2)}</pre>;
 * }
 * ```
 */
export function useUpdateModelContext() {
  const bridge = useUniversalBridge();

  return useCallback(
    async (ctx: {
      content?: ContentBlock[];
      structuredContent?: Record<string, unknown>;
    }): Promise<void> => {
      if (!bridge?.updateModelContext) {
        console.warn(
          "useUpdateModelContext: updateModelContext not available on the current host.",
        );
        return;
      }
      return bridge.updateModelContext(ctx);
    },
    [bridge],
  );
}

/**
 * Returns persisted widget state and a setter (ChatGPT extensions only).
 * State is preserved across page refreshes and conversation turns.
 * Requires `window.openai` (feature-detected by the SDK).
 *
 * @typeParam T - The shape of your widget state
 * @returns Tuple of [state, setState]
 *
 * @example
 * ```tsx
 * interface MapState {
 *   center: { lat: number; lng: number };
 *   zoom: number;
 *   selectedMarker: string | null;
 * }
 *
 * function MapWidget() {
 *   const [state, setState] = useWidgetState<MapState>();
 *
 *   const handleZoom = (zoom: number) => {
 *     setState(prev => prev ? { ...prev, zoom } : { center: { lat: 0, lng: 0 }, zoom, selectedMarker: null });
 *   };
 *
 *   return (
 *     <Map
 *       center={state?.center ?? { lat: 0, lng: 0 }}
 *       zoom={state?.zoom ?? 10}
 *       onZoomChange={handleZoom}
 *     />
 *   );
 * }
 * ```
 */
export function useWidgetState<T = Record<string, unknown>>(): [
  T | null,
  (state: T | null) => void,
] {
  const bridge = useUniversalBridge();
  const [state, setState] = useState<T | null>(() => {
    if (!bridge?.getWidgetState) return null;
    return bridge.getWidgetState() as T | null;
  });

  const setWidgetState = useCallback(
    (newState: T | null) => {
      if (!bridge?.setWidgetState) {
        console.warn(
          "useWidgetState: widget state is not available on the current host.",
        );
        return;
      }
      bridge.setWidgetState(newState as Record<string, unknown> | null);
      setState(newState);
    },
    [bridge],
  );

  return [state, setWidgetState];
}

/**
 * Returns a function for structured logging when the current host supports it.
 * Falls back to `console.log` otherwise.
 *
 * @returns Log function that accepts level and message
 *
 * @example
 * ```tsx
 * function DataProcessor() {
 *   const log = useLog();
 *
 *   const processData = async (data: unknown) => {
 *     log('info', 'Starting data processing');
 *     try {
 *       // Process data...
 *       log('debug', `Processed ${data.length} items`);
 *     } catch (error) {
 *       log('error', `Processing failed: ${error.message}`);
 *     }
 *   };
 *
 *   return <button onClick={() => processData(someData)}>Process</button>;
 * }
 * ```
 */
export function useLog() {
  const bridge = useUniversalBridge();

  return useCallback(
    (level: "debug" | "info" | "warning" | "error", data: string): void => {
      if (bridge?.sendLog) {
        bridge.sendLog(level, data);
        return;
      }
      console.log(`[${level}]`, data);
    },
    [bridge],
  );
}

/**
 * Check if a specific feature is available on the current platform.
 * This is a convenient wrapper around `useCapabilities()` for single feature checks.
 *
 * @param feature - The feature key to check
 * @returns Whether the feature is available
 *
 * @example
 * ```tsx
 * function ConditionalFeatures() {
 *   const hasWidgetState = useFeature('widgetState');
 *   const hasModelContext = useFeature('modelContext');
 *
 *   return (
 *     <div>
 *       {hasWidgetState && <StatePersistence />}
 *       {hasModelContext && <ContextUpdater />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Combine with usePlatform for platform-specific UI
 * function PlatformAwareWidget() {
 *   const platform = usePlatform();
 *   const hasFileUpload = useFeature('fileUpload');
 *
 *   return (
 *     <div>
 *       <p>Running on: {platform}</p>
 *       {hasFileUpload ? <FileUploader /> : <p>File upload not available</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeature(feature: FeatureKey): boolean {
  const capabilities = useCapabilities();
  return hasFeature(capabilities, feature);
}
