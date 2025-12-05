"use client";

// Import scope types first to ensure module augmentation is available
import "./foo-scope";

import React from "react";
import { resource, tapState } from "@assistant-ui/tap";
import {
  useAssistantClient,
  AssistantProvider,
  tapApi,
  tapStoreList,
  DerivedScope,
  useAssistantState,
  tapStoreContext,
} from "@assistant-ui/store";

export const FooItemResource = resource(
  ({
    initialValue: { id, initialBar },
    remove,
  }: {
    initialValue: { id: string; initialBar: string };
    remove: () => void;
  }) => {
    const { events } = tapStoreContext();

    const [state, setState] = tapState<{ id: string; bar: string }>({
      id,
      bar: initialBar,
    });

    const updateBar = (newBar: string) => {
      setState({ ...state, bar: newBar });
      events.emit("foo.updated", { id, newValue: newBar });
    };

    const handleRemove = () => {
      events.emit("foo.removed", { id });
      remove();
    };

    return tapApi(
      {
        getState: () => state,
        updateBar,
        remove: handleRemove,
      },
      { key: id },
    );
  },
);

/**
 * FooList resource implementation
 * Manages a list of foos using tapStoreList
 */
let counter = 3;
export const FooListResource = resource(() => {
  const { events } = tapStoreContext();
  const idGenerator = () => `foo-${++counter}`;

  const foos = tapStoreList({
    initialValues: [
      { id: "foo-1", initialBar: "First Foo" },
      { id: "foo-2", initialBar: "Second Foo" },
      { id: "foo-3", initialBar: "Third Foo" },
    ],
    resource: FooItemResource,
    idGenerator,
  });

  const addFoo = (id?: string) => {
    const newId = id ?? idGenerator();
    foos.add(newId);
    events.emit("fooList.added", { id: newId });
  };

  return tapApi({
    getState: () => ({ foos: foos.state }),
    foo: foos.api,
    addFoo,
  });
});

/**
 * FooProvider - Provides foo scope for a specific index
 */
export const FooProvider = ({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) => {
  // Create a derived client with the foo scope at the specified index
  const aui = useAssistantClient({
    foo: DerivedScope({
      source: "fooList",
      query: { index },
      get: (aui) => aui.fooList().foo({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};

/**
 * FooList component - minimal mapping component
 * Maps over the list and renders each item in a FooProvider
 */
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
