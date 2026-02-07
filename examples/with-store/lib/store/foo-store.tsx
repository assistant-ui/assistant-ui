"use client";

import "./foo-scope";

import React from "react";
import { resource, tapMemo, tapState } from "@assistant-ui/tap";
import {
  useAui,
  AuiProvider,
  tapClientList,
  Derived,
  useAuiState,
  tapAssistantEmit,
  type ClientOutput,
} from "@assistant-ui/store";

type FooData = { id: string; bar: string };

export const FooItemResource = resource(
  ({
    getInitialData,
    remove,
  }: tapClientList.ResourceProps<FooData>): ClientOutput<"foo"> => {
    const emit = tapAssistantEmit();

    const [state, setState] = tapState<FooData>(getInitialData);

    const updateBar = (newBar: string) => {
      setState({ ...state, bar: newBar });
      emit("foo.updated", { id: state.id, newValue: newBar });
    };

    const handleRemove = () => {
      emit("foo.removed", { id: state.id });
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

let counter = 3;
export const FooListResource = resource(
  ({ initialValues }: { initialValues: boolean }): ClientOutput<"fooList"> => {
    const emit = tapAssistantEmit();

    const foos = tapClientList({
      initialValues: initialValues
        ? [
            { id: "foo-1", bar: "First Foo" },
            { id: "foo-2", bar: "Second Foo" },
            { id: "foo-3", bar: "Third Foo" },
          ]
        : [],
      getKey: (foo) => foo.id,
      resource: FooItemResource,
    });

    const addFoo = () => {
      const id = `foo-${++counter}`;
      foos.add({ id: id, bar: `New Foo` });
      emit("fooList.added", { id: id });
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
  },
);

export const FooProvider = ({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) => {
  const aui = useAui({
    foo: Derived({
      source: "fooList",
      query: { index: index },
      get: (aui) => aui.fooList().foo({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

export const FooList = ({
  components,
}: {
  components: { Foo: React.ComponentType };
}) => {
  const fooListState = useAuiState((s) => s.fooList.foos.length);

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
