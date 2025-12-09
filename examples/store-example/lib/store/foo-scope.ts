import { registerAssistantScope } from "@assistant-ui/store";

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    foo: {
      value: {
        getState: () => { id: string; bar: string };
        updateBar: (newBar: string) => void;
        remove: () => void;
      };
      meta: { source: "fooList"; query: { index: number } | { id: string } };
      events: {
        "foo.updated": { id: string; newValue: string };
        "foo.removed": { id: string };
      };
    };
    fooList: {
      value: {
        getState: () => { foos: Array<{ id: string; bar: string }> };
        foo: (
          lookup: { index: number } | { id: string },
        ) => AssistantScopeRegistry["foo"]["value"];
        addFoo: (id?: string) => void;
      };
      meta: { source: "root"; query: Record<string, never> };
      events: {
        "fooList.added": { id: string };
      };
    };
  }
}

registerAssistantScope({
  name: "fooList",
  defaultInitialize: { error: "FooList is not configured" },
});

registerAssistantScope({
  name: "foo",
  defaultInitialize: { error: "Foo is not configured" },
});
