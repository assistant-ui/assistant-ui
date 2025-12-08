import { registerAssistantScope } from "@assistant-ui/store";

type FooState = { id: string; bar: string };
type FooApi = {
  getState: () => FooState;
  updateBar: (newBar: string) => void;
  remove: () => void;
};
type FooMeta = {
  source: "fooList";
  query: { index: number } | { key: string };
};

type FooListState = { foos: FooState[] };
type FooListApi = {
  getState: () => FooListState;
  foo: (lookup: FooMeta["query"]) => FooApi;
  addFoo: () => void;
};

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    foo: {
      state: FooState;
      client: FooApi;
      meta: FooMeta;
      events: {
        "foo.updated": { id: string; newValue: string };
        "foo.removed": { id: string };
      };
    };
    fooList: {
      state: FooListState;
      client: FooListApi;
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
