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

type FooListState = { foos: FooState[] };
type FooListMethods = {
  getState: () => FooListState;
  foo: (lookup: FooMeta["query"]) => FooMethods;
  addFoo: () => void;
};

declare module "@assistant-ui/store" {
  interface ClientRegistry {
    foo: {
      state: FooState;
      methods: FooMethods;
      meta: FooMeta;
      events: {
        "foo.updated": { id: string; newValue: string };
        "foo.removed": { id: string };
      };
    };
    fooList: {
      state: FooListState;
      methods: FooListMethods;
      events: {
        "fooList.added": { id: string };
      };
    };
  }
}

export default {};
