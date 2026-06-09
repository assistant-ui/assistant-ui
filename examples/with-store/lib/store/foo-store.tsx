"use client";

import "./foo-scope";

import { type ReactNode, useMemo, useState } from "react";
import { resource } from "@assistant-ui/tap";
import {
  useAui,
  useAuiState,
  AuiProvider,
  useClientList,
  Derived,
  useAssistantEmit,
  RenderChildrenWithAccessor,
  type ClientOutput,
} from "@assistant-ui/store";

type FooData = { id: string; bar: string };

const useFooItemResource = ({
  getInitialData,
  remove,
}: useClientList.ResourceProps<FooData>): ClientOutput<"foo"> => {
  const emit = useAssistantEmit();

  const [state, setState] = useState<FooData>(getInitialData);

  const updateBar = (newBar: string) => {
    setState({ ...state, bar: newBar });
    emit("foo.updated", { id: state.id, newValue: newBar });
  };

  const handleRemove = () => {
    emit("foo.removed", { id: state.id });
    remove();
  };

  return {
    getState: () => state,
    updateBar,
    remove: handleRemove,
  };
};

export const FooItemResource = resource(useFooItemResource);

let counter = 3;
const useFooListResource = ({
  initialValues,
}: {
  initialValues: boolean;
}): ClientOutput<"fooList"> => {
  const emit = useAssistantEmit();

  const foos = useClientList({
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

  const state = useMemo(() => ({ foos: foos.state }), [foos.state]);

  return {
    getState: () => state,
    foo: foos.get,
    addFoo,
  };
};

export const FooListResource = resource(useFooListResource);

const FooProvider = ({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) => {
  const aui = useAui({
    foo: Derived({
      source: "fooList",
      query: { index },
      get: (aui) => aui.fooList().foo({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

export const FooList = ({
  children,
}: {
  children: (item: { foo: FooData }) => ReactNode;
}) => {
  const length = useAuiState((s) => s.fooList.foos.length);

  return useMemo(
    () =>
      Array.from({ length }, (_, index) => (
        <FooProvider key={index} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) => aui.fooList().foo({ index }).getState()}
          >
            {(getItem) =>
              children({
                get foo() {
                  return getItem();
                },
              })
            }
          </RenderChildrenWithAccessor>
        </FooProvider>
      )),
    [length, children],
  );
};
