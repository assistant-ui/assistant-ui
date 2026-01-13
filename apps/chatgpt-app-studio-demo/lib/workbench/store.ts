"use client";

import { create } from "zustand";
import { useMemo } from "react";
import type {
  DisplayMode,
  Theme,
  DeviceType,
  ConsoleEntry,
  ConsoleEntryType,
  OpenAIGlobals,
  SafeAreaInsets,
  View,
  WidgetState,
  UserLocation,
  SimulationState,
  ToolSimulationConfig,
} from "./types";
import { DEFAULT_SIMULATION_STATE, DEFAULT_TOOL_CONFIG } from "./types";
import { DEVICE_PRESETS } from "./types";
import { workbenchComponents } from "./component-registry";
import { clearFiles } from "./file-store";
import type {
  MockConfigState,
  MockVariant,
  MockResponse,
  ToolAnnotations,
  ToolDescriptorMeta,
  ToolSchemas,
  ToolSource,
  ToolMockConfig,
} from "./mock-config";
import {
  createToolMockConfig,
  createEmptyMockConfigState,
} from "./mock-config";

const defaultComponent = workbenchComponents[0];

interface ActiveToolCall {
  toolName: string;
  delay: number;
  startTime: number;
  isHanging?: boolean;
  cancelFn?: () => void;
}

interface WorkbenchState {
  selectedComponent: string;
  displayMode: DisplayMode;
  previousDisplayMode: DisplayMode;
  theme: Theme;
  locale: string;
  deviceType: DeviceType;
  resizableWidth: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: WidgetState;
  maxHeight: number;
  intrinsicHeight: number | null;
  toolResponseMetadata: Record<string, unknown> | null;
  safeAreaInsets: SafeAreaInsets;
  consoleLogs: ConsoleEntry[];
  collapsedSections: Record<string, boolean>;
  isTransitioning: boolean;
  transitionFrom: DisplayMode | null;
  view: View | null;
  mockConfig: MockConfigState;
  userLocation: UserLocation | null;
  isWidgetClosed: boolean;
  widgetSessionId: string;
  activeToolCall: ActiveToolCall | null;
  isConsoleOpen: boolean;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  isSDKGuideOpen: boolean;
  simulation: SimulationState;
  useIframePreview: boolean;
  conversationMode: boolean;

  setSelectedComponent: (id: string) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setTransitioning: (transitioning: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: string) => void;
  setDeviceType: (type: DeviceType) => void;
  setToolInput: (input: Record<string, unknown>) => void;
  setToolOutput: (output: Record<string, unknown> | null) => void;
  setWidgetState: (state: WidgetState) => void;
  updateWidgetState: (state: Record<string, unknown>) => void;
  setMaxHeight: (height: number) => void;
  setIntrinsicHeight: (height: number | null) => void;
  setToolResponseMetadata: (metadata: Record<string, unknown> | null) => void;
  setSafeAreaInsets: (insets: Partial<SafeAreaInsets>) => void;
  addConsoleEntry: (entry: {
    type: ConsoleEntryType;
    method: string;
    args?: unknown;
    result?: unknown;
  }) => void;
  clearConsole: () => void;
  restoreConsoleLogs: (entries: ConsoleEntry[]) => void;
  toggleSection: (section: string) => void;
  setView: (view: View | null) => void;
  getOpenAIGlobals: () => OpenAIGlobals;
  setUserLocation: (location: UserLocation | null) => void;
  setWidgetClosed: (closed: boolean) => void;
  setActiveToolCall: (call: ActiveToolCall | null) => void;
  cancelActiveToolCall: () => void;
  setConsoleOpen: (open: boolean) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setSDKGuideOpen: (open: boolean) => void;
  setResizableWidth: (width: number) => void;
  selectSimTool: (toolName: string | null) => void;
  registerSimTool: (toolName: string) => void;
  setSimToolConfig: (
    toolName: string,
    config: Partial<ToolSimulationConfig>,
  ) => void;

  setMocksEnabled: (enabled: boolean) => void;
  setServerUrl: (url: string) => void;
  setToolSource: (toolName: string, source: ToolSource) => void;
  registerTool: (toolName: string) => void;
  registerToolsFromServer: (
    tools: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>,
  ) => void;
  removeTool: (toolName: string) => void;
  setActiveVariant: (toolName: string, variantId: string | null) => void;
  setInterceptMode: (toolName: string, enabled: boolean) => void;
  addVariant: (toolName: string, variant: MockVariant) => void;
  updateVariant: (
    toolName: string,
    variantId: string,
    updates: Partial<MockVariant>,
  ) => void;
  removeVariant: (toolName: string, variantId: string) => void;
  updateToolResponse: (toolName: string, response: MockResponse) => void;
  setMockConfig: (config: MockConfigState) => void;
  setToolAnnotations: (toolName: string, annotations: ToolAnnotations) => void;
  setToolDescriptorMeta: (toolName: string, meta: ToolDescriptorMeta) => void;
  setToolSchemas: (toolName: string, schemas: ToolSchemas) => void;
  setIframePreview: (enabled: boolean) => void;
  setConversationMode: (enabled: boolean) => void;
}

function buildOpenAIGlobals(
  state: Pick<
    WorkbenchState,
    | "theme"
    | "locale"
    | "displayMode"
    | "previousDisplayMode"
    | "maxHeight"
    | "toolInput"
    | "toolOutput"
    | "toolResponseMetadata"
    | "widgetState"
    | "deviceType"
    | "safeAreaInsets"
    | "view"
    | "userLocation"
  >,
): OpenAIGlobals {
  const preset = DEVICE_PRESETS[state.deviceType];

  return {
    theme: state.theme,
    locale: state.locale,
    displayMode: state.displayMode,
    previousDisplayMode: state.previousDisplayMode,
    maxHeight: state.maxHeight,
    toolInput: state.toolInput,
    toolOutput: state.toolOutput,
    toolResponseMetadata: state.toolResponseMetadata,
    widgetState: state.widgetState,
    userAgent: preset.userAgent,
    safeArea: {
      insets: state.safeAreaInsets,
    },
    view: state.view,
    userLocation: state.userLocation,
  };
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  selectedComponent: defaultComponent?.id ?? "chart",
  displayMode: "inline",
  previousDisplayMode: "inline",
  theme: "light",
  locale: "en-US",
  deviceType: "desktop",
  resizableWidth: 500,
  toolInput: defaultComponent?.defaultProps ?? {},
  toolOutput: null,
  widgetState: null,
  maxHeight: 400,
  intrinsicHeight: null,
  toolResponseMetadata: null,
  safeAreaInsets: { top: 10, bottom: 100, left: 10, right: 10 },
  consoleLogs: [],
  collapsedSections: {},
  isTransitioning: false,
  transitionFrom: null,
  view: null,
  mockConfig: createEmptyMockConfigState(),
  userLocation: null,
  isWidgetClosed: false,
  widgetSessionId: crypto.randomUUID(),
  activeToolCall: null,
  isConsoleOpen: false,
  isLeftPanelOpen: true,
  isRightPanelOpen: true,
  isSDKGuideOpen: false,
  simulation: DEFAULT_SIMULATION_STATE,
  useIframePreview: false,
  conversationMode: false,
  setSelectedComponent: (id) => {
    clearFiles();
    set(() => {
      const entry = workbenchComponents.find((comp) => comp.id === id) ?? null;

      return {
        selectedComponent: id,
        toolInput: entry?.defaultProps ?? {},
        toolOutput: null,
        widgetState: null,
        intrinsicHeight: null,
        toolResponseMetadata: null,
        isWidgetClosed: false,
        widgetSessionId: crypto.randomUUID(),
      };
    });
  },
  setDisplayMode: (mode) =>
    set((state) => {
      if (mode === "fullscreen" && state.displayMode !== "fullscreen") {
        return { displayMode: mode, previousDisplayMode: state.displayMode };
      }
      return { displayMode: mode };
    }),
  setTransitioning: (transitioning) =>
    set((state) => ({
      isTransitioning: transitioning,
      transitionFrom: transitioning ? state.displayMode : null,
    })),
  setTheme: (theme) => set(() => ({ theme })),
  setLocale: (locale) => set(() => ({ locale })),
  setDeviceType: (type) =>
    set((state) => {
      if (type === "resizable" && state.deviceType !== "resizable") {
        const previousPreset = DEVICE_PRESETS[state.deviceType];
        const previousWidth =
          typeof previousPreset.width === "number" ? previousPreset.width : 500;
        return { deviceType: type, resizableWidth: previousWidth };
      }
      return { deviceType: type };
    }),
  setToolInput: (input) => set(() => ({ toolInput: input })),
  setToolOutput: (output) => set(() => ({ toolOutput: output })),
  setWidgetState: (state) => set(() => ({ widgetState: state })),
  updateWidgetState: (state) =>
    set((prev) => ({
      widgetState: { ...(prev.widgetState ?? {}), ...state },
    })),
  setMaxHeight: (height) => set(() => ({ maxHeight: height })),
  setIntrinsicHeight: (height) => set(() => ({ intrinsicHeight: height })),
  setToolResponseMetadata: (metadata) =>
    set(() => ({ toolResponseMetadata: metadata })),
  setSafeAreaInsets: (insets) =>
    set((prev) => ({
      safeAreaInsets: { ...prev.safeAreaInsets, ...insets },
    })),
  addConsoleEntry: (entry) =>
    set((state) => {
      const MAX_CONSOLE_ENTRIES = 500;
      const newEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };
      const logs = [...state.consoleLogs, newEntry];
      return {
        consoleLogs:
          logs.length > MAX_CONSOLE_ENTRIES
            ? logs.slice(logs.length - MAX_CONSOLE_ENTRIES)
            : logs,
      };
    }),
  clearConsole: () => set(() => ({ consoleLogs: [] })),
  restoreConsoleLogs: (entries) => set(() => ({ consoleLogs: entries })),
  toggleSection: (section) =>
    set((state) => ({
      collapsedSections: {
        ...state.collapsedSections,
        [section]: !state.collapsedSections[section],
      },
    })),
  setView: (view) => set(() => ({ view })),
  getOpenAIGlobals: () => {
    const state = get();
    return buildOpenAIGlobals(state);
  },
  setUserLocation: (location) => set(() => ({ userLocation: location })),
  setWidgetClosed: (closed) => set(() => ({ isWidgetClosed: closed })),
  setActiveToolCall: (call) => set(() => ({ activeToolCall: call })),
  cancelActiveToolCall: () => {
    const { activeToolCall } = get();
    if (activeToolCall?.cancelFn) {
      activeToolCall.cancelFn();
    }
    set(() => ({ activeToolCall: null }));
  },
  setConsoleOpen: (open) => set(() => ({ isConsoleOpen: open })),
  setLeftPanelOpen: (open) => set(() => ({ isLeftPanelOpen: open })),
  setRightPanelOpen: (open) => set(() => ({ isRightPanelOpen: open })),
  setSDKGuideOpen: (open) => set(() => ({ isSDKGuideOpen: open })),
  setResizableWidth: (width) => set(() => ({ resizableWidth: width })),
  setIframePreview: (enabled) => set(() => ({ useIframePreview: enabled })),
  setConversationMode: (enabled) => set(() => ({ conversationMode: enabled })),
  selectSimTool: (toolName) =>
    set((state) => ({
      simulation: { ...state.simulation, selectedTool: toolName },
    })),
  registerSimTool: (toolName) =>
    set((state) => {
      if (state.simulation.tools[toolName]) return state;
      return {
        simulation: {
          ...state.simulation,
          tools: {
            ...state.simulation.tools,
            [toolName]: { ...DEFAULT_TOOL_CONFIG },
          },
        },
      };
    }),
  setSimToolConfig: (toolName, config) =>
    set((state) => {
      const existing = state.simulation.tools[toolName] ?? DEFAULT_TOOL_CONFIG;
      return {
        simulation: {
          ...state.simulation,
          tools: {
            ...state.simulation.tools,
            [toolName]: { ...existing, ...config },
          },
        },
      };
    }),

  setMocksEnabled: (enabled) =>
    set((state) => ({
      mockConfig: { ...state.mockConfig, globalEnabled: enabled },
    })),

  setServerUrl: (url) =>
    set((state) => ({
      mockConfig: { ...state.mockConfig, serverUrl: url },
    })),

  setToolSource: (toolName, source) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: { ...tool, source },
          },
        },
      };
    }),

  registerTool: (toolName) =>
    set((state) => {
      if (state.mockConfig.tools[toolName]) {
        return state;
      }
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: createToolMockConfig(toolName),
          },
        },
      };
    }),

  registerToolsFromServer: (tools) =>
    set((state) => {
      const newTools: Record<string, ToolMockConfig> = {};
      for (const tool of tools) {
        if (!state.mockConfig.tools[tool.name]) {
          const config = createToolMockConfig(tool.name);
          config.source = "server";
          if (tool.inputSchema) {
            config.schemas = { inputSchema: tool.inputSchema };
          }
          newTools[tool.name] = config;
        }
      }
      if (Object.keys(newTools).length === 0) {
        return state;
      }
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            ...newTools,
          },
        },
      };
    }),

  removeTool: (toolName) =>
    set((state) => {
      const { [toolName]: _removed, ...remainingTools } =
        state.mockConfig.tools;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: remainingTools,
        },
      };
    }),

  setActiveVariant: (toolName, variantId) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: { ...tool, activeVariantId: variantId },
          },
        },
      };
    }),

  setInterceptMode: (toolName, enabled) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: { ...tool, interceptMode: enabled },
          },
        },
      };
    }),

  addVariant: (toolName, variant) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: {
              ...tool,
              variants: [...tool.variants, variant],
            },
          },
        },
      };
    }),

  updateVariant: (toolName, variantId, updates) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: {
              ...tool,
              variants: tool.variants.map((v) =>
                v.id === variantId ? { ...v, ...updates } : v,
              ),
            },
          },
        },
      };
    }),

  removeVariant: (toolName, variantId) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      const newActiveId =
        tool.activeVariantId === variantId ? null : tool.activeVariantId;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: {
              ...tool,
              activeVariantId: newActiveId,
              variants: tool.variants.filter((v) => v.id !== variantId),
            },
          },
        },
      };
    }),

  updateToolResponse: (toolName, response) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: { ...tool, mockResponse: response },
          },
        },
      };
    }),

  setMockConfig: (config) => set(() => ({ mockConfig: config })),

  setToolAnnotations: (toolName, annotations) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: { ...tool, annotations },
          },
        },
      };
    }),

  setToolDescriptorMeta: (toolName, meta) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: { ...tool, descriptorMeta: meta },
          },
        },
      };
    }),

  setToolSchemas: (toolName, schemas) =>
    set((state) => {
      const tool = state.mockConfig.tools[toolName];
      if (!tool) return state;
      return {
        mockConfig: {
          ...state.mockConfig,
          tools: {
            ...state.mockConfig.tools,
            [toolName]: { ...tool, schemas },
          },
        },
      };
    }),
}));

export const useSelectedComponent = () =>
  useWorkbenchStore((s) => s.selectedComponent);
export const useDisplayMode = () => useWorkbenchStore((s) => s.displayMode);
export const usePreviousDisplayMode = () =>
  useWorkbenchStore((s) => s.previousDisplayMode);
export const useIsTransitioning = () =>
  useWorkbenchStore((s) => s.isTransitioning);
export const useTransitionFrom = () =>
  useWorkbenchStore((s) => s.transitionFrom);
export const useWorkbenchTheme = () => useWorkbenchStore((s) => s.theme);
export const useDeviceType = () => useWorkbenchStore((s) => s.deviceType);
export const useConsoleLogs = () => useWorkbenchStore((s) => s.consoleLogs);
export const useClearConsole = () => useWorkbenchStore((s) => s.clearConsole);
export const useToolInput = () => useWorkbenchStore((s) => s.toolInput);
export const useToolOutput = () => useWorkbenchStore((s) => s.toolOutput);
export const useMockConfig = () => useWorkbenchStore((s) => s.mockConfig);
export const useIframePreview = () =>
  useWorkbenchStore((s) => s.useIframePreview);

export const useOpenAIGlobals = (): OpenAIGlobals => {
  const theme = useWorkbenchStore((s) => s.theme);
  const locale = useWorkbenchStore((s) => s.locale);
  const displayMode = useWorkbenchStore((s) => s.displayMode);
  const previousDisplayMode = useWorkbenchStore((s) => s.previousDisplayMode);
  const maxHeight = useWorkbenchStore((s) => s.maxHeight);
  const toolInput = useWorkbenchStore((s) => s.toolInput);
  const toolOutput = useWorkbenchStore((s) => s.toolOutput);
  const toolResponseMetadata = useWorkbenchStore((s) => s.toolResponseMetadata);
  const widgetState = useWorkbenchStore((s) => s.widgetState);
  const deviceType = useWorkbenchStore((s) => s.deviceType);
  const safeAreaInsets = useWorkbenchStore((s) => s.safeAreaInsets);
  const view = useWorkbenchStore((s) => s.view);
  const userLocation = useWorkbenchStore((s) => s.userLocation);

  return useMemo(
    () =>
      buildOpenAIGlobals({
        theme,
        locale,
        displayMode,
        previousDisplayMode,
        maxHeight,
        toolInput,
        toolOutput,
        toolResponseMetadata,
        widgetState,
        deviceType,
        safeAreaInsets,
        view,
        userLocation,
      }),
    [
      theme,
      locale,
      displayMode,
      previousDisplayMode,
      maxHeight,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      widgetState,
      deviceType,
      safeAreaInsets,
      view,
      userLocation,
    ],
  );
};

export const useIsWidgetClosed = () =>
  useWorkbenchStore((s) => s.isWidgetClosed);
export const useWidgetSessionId = () =>
  useWorkbenchStore((s) => s.widgetSessionId);
export const useActiveToolCall = () =>
  useWorkbenchStore((s) => s.activeToolCall);
export const useCancelActiveToolCall = () =>
  useWorkbenchStore((s) => s.cancelActiveToolCall);
export const useIsConsoleOpen = () => useWorkbenchStore((s) => s.isConsoleOpen);
export const useIsLeftPanelOpen = () =>
  useWorkbenchStore((s) => s.isLeftPanelOpen);
export const useIsRightPanelOpen = () =>
  useWorkbenchStore((s) => s.isRightPanelOpen);
export const useIsSDKGuideOpen = () =>
  useWorkbenchStore((s) => s.isSDKGuideOpen);
export const useSimulation = () => useWorkbenchStore((s) => s.simulation);
export const useResizableWidth = () =>
  useWorkbenchStore((s) => s.resizableWidth);
export const useServerUrl = () =>
  useWorkbenchStore((s) => s.mockConfig.serverUrl);
export const useConversationMode = () =>
  useWorkbenchStore((s) => s.conversationMode);
