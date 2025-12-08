"use client";

import "./foo-scope";

import React from "react";
import { resource, tapMemo, tapState } from "@assistant-ui/tap";
import {
  useAssistantClient,
  AssistantProvider,
  tapClientList,
  Derived,
  useAssistantState,
  tapEmitClientEvent,
  type ClientResourceOutput,
} from "@assistant-ui/store";

type FooInitialData = { id: string; initialBar: string };

export const FooItemResource = resource(
  ({
    key,
    getInitialData,
    remove,
  }: tapClientList.ResourceProps<FooInitialData>): ClientResourceOutput<"foo"> => {
    const emit = tapEmitClientEvent();

    const [state, setState] = tapState<{ id: string; bar: string }>(() => ({
      id: key,
      bar: getInitialData().initialBar,
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

const counter = 3;
export const FooListResource = resource((): ClientResourceOutput<"fooList"> => {
  const emit = tapEmitClientEvent();

  const foos = tapClientList({
    initialValues: [
      { id: "foo-1", initialBar: "First Foo" },
      { id: "foo-2", initialBar: "Second Foo" },
      { id: "foo-3", initialBar: "Third Foo" },
    ],
    getKey: (foo) => foo.id,
    resource: FooItemResource,
  });

  const addFoo = () => {
    const id = `foo-${counter + 1}`;
    foos.add({ id: id, initialBar: `New Foo` });
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
});

export const FooProvider = ({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) => {
  const aui = useAssistantClient({
    foo: Derived({
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
