import { describe, it, expect, beforeEach } from "vitest";
import { useWorkbenchStore } from "./store";
import { workbenchComponents } from "./component-registry";

describe("Workbench Store", () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useWorkbenchStore.getState();
    // Reset to initial state by selecting the first component
    const defaultComponent = workbenchComponents[0];
    store.setSelectedComponent(defaultComponent?.id ?? "chart");
  });

  describe("setSelectedComponent", () => {
    it("should update selectedComponent to the given id", () => {
      const store = useWorkbenchStore.getState();
      const targetComponent = workbenchComponents[1]; // Pick second component

      if (!targetComponent) {
        throw new Error("Test requires at least 2 components in registry");
      }

      store.setSelectedComponent(targetComponent.id);

      expect(useWorkbenchStore.getState().selectedComponent).toBe(
        targetComponent.id,
      );
    });

    it("should reset toolInput to component's defaultProps", () => {
      const store = useWorkbenchStore.getState();
      const targetComponent = workbenchComponents[1];

      if (!targetComponent) {
        throw new Error("Test requires at least 2 components in registry");
      }

      store.setSelectedComponent(targetComponent.id);

      expect(useWorkbenchStore.getState().toolInput).toEqual(
        targetComponent.defaultProps,
      );
    });

    it("should reset toolOutput to null", () => {
      const store = useWorkbenchStore.getState();

      // First set toolOutput to something non-null
      store.setToolOutput({ someKey: "someValue" });
      expect(useWorkbenchStore.getState().toolOutput).not.toBeNull();

      // Switch component - should reset to null
      const targetComponent = workbenchComponents[0];
      if (!targetComponent) {
        throw new Error("Test requires at least 1 component in registry");
      }

      store.setSelectedComponent(targetComponent.id);

      expect(useWorkbenchStore.getState().toolOutput).toBeNull();
    });

    it("should reset widgetState to null", () => {
      const store = useWorkbenchStore.getState();

      // First set widgetState to something non-null
      store.setWidgetState({ someKey: "someValue" });
      expect(useWorkbenchStore.getState().widgetState).not.toBeNull();

      // Switch component - should reset to null
      const targetComponent = workbenchComponents[0];
      if (!targetComponent) {
        throw new Error("Test requires at least 1 component in registry");
      }

      store.setSelectedComponent(targetComponent.id);

      expect(useWorkbenchStore.getState().widgetState).toBeNull();
    });

    it("should reset toolResponseMetadata to null", () => {
      const store = useWorkbenchStore.getState();

      // First set toolResponseMetadata to something non-null
      store.setToolResponseMetadata({ someKey: "someValue" });
      expect(useWorkbenchStore.getState().toolResponseMetadata).not.toBeNull();

      // Switch component - should reset to null
      const targetComponent = workbenchComponents[0];
      if (!targetComponent) {
        throw new Error("Test requires at least 1 component in registry");
      }

      store.setSelectedComponent(targetComponent.id);

      expect(useWorkbenchStore.getState().toolResponseMetadata).toBeNull();
    });

    it("should handle non-existent component gracefully", () => {
      const store = useWorkbenchStore.getState();

      store.setSelectedComponent("non-existent-component-id");

      expect(useWorkbenchStore.getState().selectedComponent).toBe(
        "non-existent-component-id",
      );
      expect(useWorkbenchStore.getState().toolInput).toEqual({});
      expect(useWorkbenchStore.getState().toolOutput).toBeNull();
      expect(useWorkbenchStore.getState().widgetState).toBeNull();
      expect(useWorkbenchStore.getState().toolResponseMetadata).toBeNull();
    });
  });

  describe("getOpenAIGlobals", () => {
    it("should return correct theme", () => {
      const store = useWorkbenchStore.getState();

      store.setTheme("dark");
      const globals = store.getOpenAIGlobals();

      expect(globals.theme).toBe("dark");
    });

    it("should return correct locale", () => {
      const store = useWorkbenchStore.getState();

      store.setLocale("es-ES");
      const globals = store.getOpenAIGlobals();

      expect(globals.locale).toBe("es-ES");
    });

    it("should return correct displayMode", () => {
      const store = useWorkbenchStore.getState();

      store.setDisplayMode("fullscreen");
      const globals = store.getOpenAIGlobals();

      expect(globals.displayMode).toBe("fullscreen");
    });

    it("should return correct maxHeight", () => {
      const store = useWorkbenchStore.getState();

      store.setMaxHeight(1200);
      const globals = store.getOpenAIGlobals();

      expect(globals.maxHeight).toBe(1200);
    });

    it("should include toolInput", () => {
      const store = useWorkbenchStore.getState();
      const testInput = { testKey: "testValue" };

      store.setToolInput(testInput);
      const globals = store.getOpenAIGlobals();

      expect(globals.toolInput).toEqual(testInput);
    });

    it("should include toolOutput (null when unset)", () => {
      const store = useWorkbenchStore.getState();

      store.setToolOutput(null);
      const globals = store.getOpenAIGlobals();

      expect(globals.toolOutput).toBeNull();
    });

    it("should include toolOutput (object when set)", () => {
      const store = useWorkbenchStore.getState();
      const testOutput = { resultKey: "resultValue" };

      store.setToolOutput(testOutput);
      const globals = store.getOpenAIGlobals();

      expect(globals.toolOutput).toEqual(testOutput);
    });

    it("should include widgetState", () => {
      const store = useWorkbenchStore.getState();
      const testState = { stateKey: "stateValue" };

      store.setWidgetState(testState);
      const globals = store.getOpenAIGlobals();

      expect(globals.widgetState).toEqual(testState);
    });

    it("should include toolResponseMetadata", () => {
      const store = useWorkbenchStore.getState();
      const testMetadata = { metaKey: "metaValue" };

      store.setToolResponseMetadata(testMetadata);
      const globals = store.getOpenAIGlobals();

      expect(globals.toolResponseMetadata).toEqual(testMetadata);
    });

    it("should include safeAreaInsets", () => {
      const store = useWorkbenchStore.getState();
      const testInsets = { top: 10, bottom: 20, left: 5, right: 5 };

      store.setSafeAreaInsets(testInsets);
      const globals = store.getOpenAIGlobals();

      expect(globals.safeArea.insets).toEqual(testInsets);
    });

    it("should include userAgent with device type", () => {
      const store = useWorkbenchStore.getState();

      store.setDeviceType("mobile");
      const globals = store.getOpenAIGlobals();

      expect(globals.userAgent.device.type).toBe("mobile");
    });

    it("should include userAgent capabilities for mobile (no hover, touch)", () => {
      const store = useWorkbenchStore.getState();

      store.setDeviceType("mobile");
      const globals = store.getOpenAIGlobals();

      expect(globals.userAgent.capabilities.hover).toBe(false);
      expect(globals.userAgent.capabilities.touch).toBe(true);
    });

    it("should include userAgent capabilities for desktop (hover, no touch)", () => {
      const store = useWorkbenchStore.getState();

      store.setDeviceType("desktop");
      const globals = store.getOpenAIGlobals();

      expect(globals.userAgent.capabilities.hover).toBe(true);
      expect(globals.userAgent.capabilities.touch).toBe(false);
    });
  });

  describe("setDeviceType", () => {
    it("should update deviceType without changing maxHeight", () => {
      const store = useWorkbenchStore.getState();
      const initialMaxHeight = store.maxHeight;

      store.setDeviceType("mobile");
      const state = useWorkbenchStore.getState();

      expect(state.deviceType).toBe("mobile");
      expect(state.maxHeight).toBe(initialMaxHeight);
    });

    it("should update deviceType to tablet without changing maxHeight", () => {
      const store = useWorkbenchStore.getState();
      store.setMaxHeight(500);

      store.setDeviceType("tablet");
      const state = useWorkbenchStore.getState();

      expect(state.deviceType).toBe("tablet");
      expect(state.maxHeight).toBe(500);
    });

    it("should update deviceType to desktop without changing maxHeight", () => {
      const store = useWorkbenchStore.getState();
      store.setMaxHeight(600);

      store.setDeviceType("desktop");
      const state = useWorkbenchStore.getState();

      expect(state.deviceType).toBe("desktop");
      expect(state.maxHeight).toBe(600);
    });
  });

  describe("OpenAI Globals Consistency", () => {
    it("should reflect all state changes in getOpenAIGlobals", () => {
      const store = useWorkbenchStore.getState();

      // Set various state values
      store.setTheme("dark");
      store.setLocale("fr-FR");
      store.setDisplayMode("pip");
      store.setDeviceType("tablet");
      store.setMaxHeight(1500);
      store.setToolInput({ input1: "value1" });
      store.setToolOutput({ output1: "result1" });
      store.setWidgetState({ state1: "stateValue1" });
      store.setToolResponseMetadata({ meta1: "metaValue1" });
      store.setSafeAreaInsets({ top: 15, bottom: 25, left: 10, right: 10 });

      const globals = store.getOpenAIGlobals();

      // Verify all values are correctly reflected
      expect(globals.theme).toBe("dark");
      expect(globals.locale).toBe("fr-FR");
      expect(globals.displayMode).toBe("pip");
      expect(globals.maxHeight).toBe(1500);
      expect(globals.toolInput).toEqual({ input1: "value1" });
      expect(globals.toolOutput).toEqual({ output1: "result1" });
      expect(globals.widgetState).toEqual({ state1: "stateValue1" });
      expect(globals.toolResponseMetadata).toEqual({ meta1: "metaValue1" });
      expect(globals.safeArea.insets).toEqual({
        top: 15,
        bottom: 25,
        left: 10,
        right: 10,
      });
      expect(globals.userAgent.device.type).toBe("tablet");
    });

    it("should maintain consistent structure across multiple calls", () => {
      const store = useWorkbenchStore.getState();

      const globals1 = store.getOpenAIGlobals();
      const globals2 = store.getOpenAIGlobals();

      // Should have identical structure
      expect(globals1).toEqual(globals2);
      expect(Object.keys(globals1).sort()).toEqual(
        Object.keys(globals2).sort(),
      );
    });

    it("should handle null values correctly in globals", () => {
      const store = useWorkbenchStore.getState();

      // Set all nullable fields to null
      store.setToolOutput(null);
      store.setWidgetState(null);
      store.setToolResponseMetadata(null);

      const globals = store.getOpenAIGlobals();

      expect(globals.toolOutput).toBeNull();
      expect(globals.widgetState).toBeNull();
      expect(globals.toolResponseMetadata).toBeNull();
    });

    it("should update globals when safeAreaInsets are partially updated", () => {
      const store = useWorkbenchStore.getState();

      // Set initial insets
      store.setSafeAreaInsets({ top: 10, bottom: 10, left: 10, right: 10 });

      // Partially update (should merge with existing)
      store.setSafeAreaInsets({ top: 20 });

      const globals = store.getOpenAIGlobals();

      expect(globals.safeArea.insets.top).toBe(20);
      expect(globals.safeArea.insets.bottom).toBe(10);
      expect(globals.safeArea.insets.left).toBe(10);
      expect(globals.safeArea.insets.right).toBe(10);
    });
  });
});
