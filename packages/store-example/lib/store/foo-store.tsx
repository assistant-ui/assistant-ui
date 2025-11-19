"use client";

import React from "react";
import { resource, tapState } from "@assistant-ui/tap";
import {
  useAssistantClient,
  AssistantProvider,
  tapApi,
  tapLookupResources,
  DerivedScope,
  useAssistantState,
} from "@assistant-ui/store";

/**
 * Single Foo item resource
 * Manages the state and actions for a single foo item
 */
export const FooItemResource = resource(
  ({ id, initialBar }: { id: string; initialBar: string }) => {
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
 * Manages a list of foos using tapLookupResources
 */
export const FooListResource = resource(() => {
  // Sample data - in a real app, this would come from props or external state
  const items = [
    { id: "foo-1", initialBar: "First Foo" },
    { id: "foo-2", initialBar: "Second Foo" },
    { id: "foo-3", initialBar: "Third Foo" },
  ];

  const foos = tapLookupResources(
    items.map((item) => FooItemResource(item, { key: item.id })),
  );

  return tapApi({
    getState: () => ({ foos: foos.state }),
    foo: (lookup: { index: number } | { id: string }) => {
      return "id" in lookup
        ? foos.api({ key: lookup.id })
        : foos.api({ index: lookup.index });
    },
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
  const parentAui = useAssistantClient();

  // Create a derived client with the foo scope at the specified index
  const aui = useAssistantClient({
    foo: DerivedScope({
      source: "fooList",
      query: { index },
      get: () => parentAui.fooList().foo({ index }),
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
