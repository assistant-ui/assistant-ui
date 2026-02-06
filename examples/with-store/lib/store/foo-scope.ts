import "@assistant-ui/store";

type FooState = { id: string; bar: string };
type FooMethods = {
  getState: () => FooState;
  updateBar: (newBar: string) => void;
  remove: () => void;
};
type FooMeta = {
  source: "fooList";
  query: { index: number } | { key: string };
};
type FooEvents = {
  "foo.updated": { id: string; newValue: string };
  "foo.removed": { id: string };
};

type FooListState = { foos: FooState[] };
type FooListMethods = {
  getState: () => FooListState;
  foo: (lookup: FooMeta["query"]) => FooMethods;
  addFoo: () => void;
};
type FooListEvents = {
  "fooList.added": { id: string };
};

declare module "@assistant-ui/store" {
  interface ClientRegistry {
    foo: {
      methods: FooMethods;
      meta: FooMeta;
      events: FooEvents;
    };
    fooList: {
      methods: FooListMethods;
      events: FooListEvents;
    };
  }
}
