"use client";

import "./foo-scope";

import React from "react";
import { resource, tapMemo, tapState } from "@assistant-ui/tap";
import {
  useAssistantClient,
  AssistantProvider,
  tapClientList,
  DerivedClient,
  useAssistantState,
  tapEmit,
  type ClientOutput,
} from "@assistant-ui/store";

type FooInitialData = { initialBar: string };

export const FooItemResource = resource(
  ({
    key,
    initialData,
    remove,
  }: tapClientList.ResourceProps<FooInitialData>): ClientOutput<"foo"> => {
    const emit = tapEmit();

    const [state, setState] = tapState<{ id: string; bar: string }>(() => ({
      id: key,
      bar: initialData!.initialBar,
    }));

    const updateBar = (newBar: string) => {
      setState({ ...state, bar: newBar });
      emit("foo.updated", { id: key, newValue: newBar });
    };

    const handleRemove = () => {
      emit("foo.removed", { id: key });
      remove();
    };

    return {
      state,
      methods: {
        getState: () => state,
        updateBar,
        remove: handleRemove,
      },
    };
  },
);

let counter = 0;
export const FooListResource = resource((): ClientOutput<"fooList"> => {
  const emit = tapEmit();

  const foos = tapClientList({
    initialValues: [
      { initialBar: "First Foo" },
      { initialBar: "Second Foo" },
      { initialBar: "Third Foo" },
    ],
    getKey: () => `foo-${++counter}`,
    resource: FooItemResource,
  });

  const addFoo = () => {
    const key = `foo-${counter + 1}`;
    foos.add({ initialBar: `New Foo` });
    emit("fooList.added", { id: key });
  };

  const state = tapMemo(() => ({ foos: foos.state }), [foos.state]);

  return {
    state,
    methods: {
      getState: () => state,
      foo: foos.get,
      addFoo,
    },
  };
});

export const FooProvider = ({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) => {
  const aui = useAssistantClient({
    foo: DerivedClient({
      source: "fooList",
      query: { index },
      get: (aui) => aui.fooList().foo({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};

export const FooList = ({
  components,
}: {
  components: { Foo: React.ComponentType };
}) => {
  const fooListState = useAssistantState(({ fooList }) => fooList.foos.length);

  return (
    <>
      {Array.from({ length: fooListState }, (_, index) => (
        <FooProvider key={index} index={index}>
          <components.Foo />
        </FooProvider>
      ))}
    </>
  );
};
