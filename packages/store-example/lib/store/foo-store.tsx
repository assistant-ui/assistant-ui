"use client";

import React from "react";
import { resource, tapState } from "@assistant-ui/tap";
import {
  useAssistantClient,
  AssistantProvider,
  tapApi,
  tapStoreList,
  DerivedScope,
  useAssistantState,
} from "@assistant-ui/store";

/**
 * Single Foo item resource
 * Manages the state and actions for a single foo item
 */
export const FooItemResource = resource(
  ({
    initialValue: { id, initialBar },
  }: {
    initialValue: { id: string; initialBar: string };
  }) => {
    const [state, setState] = tapState<{ id: string; bar: string }>({
      id,
      bar: initialBar,
    });

    const updateBar = (newBar: string) => {
      setState({ ...state, bar: newBar });
    };

    return tapApi(
      {
        getState: () => state,
        updateBar,
      },
      { key: id },
    );
  },
);

/**
 * FooList resource implementation
 * Manages a list of foos using tapStoreList
 */
export const FooListResource = resource(() => {
  let counter = 3;
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

  return tapApi({
    getState: () => ({ foos: foos.state }),
    foo: foos.api,
    addFoo: (id?: string) => foos.add(id),
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
