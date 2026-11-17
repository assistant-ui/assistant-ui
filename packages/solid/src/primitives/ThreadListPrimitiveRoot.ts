import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  createThreadListCollection,
  ThreadListCollectionContext,
} from "./threadListFocusGroup";

/** Provides the thread list's keyboard navigation collection in a div. */
export const ThreadListPrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [, rest] = splitProps(props, []);
  const collection = createThreadListCollection();
  return createComponent(ThreadListCollectionContext.Provider, {
    value: collection,
    get children() {
      return createComponent(Dynamic, mergeProps(rest, { component: "div" }));
    },
  });
};
