/**
 * Scope registration for the foo example
 * Import this file to register the default fooList scope
 */
import { registerAssistantScope } from "@assistant-ui/store";

/**
 * Define scopes via module augmentation
 * Implement the scope definition raw without importing ScopeDefinition
 */
declare module "@assistant-ui/store" {
  interface AssistantScopes {
    foo: {
      value: {
        getState: () => { id: string; bar: string };
        updateBar: (newBar: string) => void;
      };
      source: "fooList";
      query: { index: number } | { id: string };
    };
    fooList: {
      value: {
        getState: () => { foos: Array<{ id: string; bar: string }> };
        foo: (
          lookup: { index: number } | { id: string },
        ) => AssistantScopes["foo"]["value"];
      };
      source: "root";
      query: Record<string, never>;
    };
  }
}

// Register the fooList scope with a default implementation
registerAssistantScope({
  name: "fooList",
  defaultInitialize: { error: "FooList is not configured" },
});
