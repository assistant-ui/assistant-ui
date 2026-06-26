"use client";

import {
  createContext,
  type Dispatch,
  type FC,
  type SetStateAction,
  useContext,
} from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { type ScopedProps, useDropdownMenuScope } from "./scope";

const ThreadListItemMoreSetOpenContext = createContext<
  Dispatch<SetStateAction<boolean>>
>(() => {});

export const useThreadListItemMoreSetOpen = (): Dispatch<
  SetStateAction<boolean>
> => useContext(ThreadListItemMoreSetOpenContext);

export namespace ThreadListItemMorePrimitiveRoot {
  export type Props = DropdownMenuPrimitive.DropdownMenuProps;
}

export const ThreadListItemMorePrimitiveRoot: FC<
  ThreadListItemMorePrimitiveRoot.Props
> = ({
  __scopeThreadListItemMore,
  open: openProp,
  defaultOpen,
  onOpenChange,
  modal = false,
  ...rest
}: ScopedProps<ThreadListItemMorePrimitiveRoot.Props>) => {
  const scope = useDropdownMenuScope(__scopeThreadListItemMore);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    caller: "ThreadListItemMorePrimitive.Root",
    ...(onOpenChange ? { onChange: onOpenChange } : {}),
  });

  return (
    <ThreadListItemMoreSetOpenContext.Provider value={setOpen}>
      <DropdownMenuPrimitive.Root
        {...scope}
        {...rest}
        modal={modal}
        open={open}
        onOpenChange={setOpen}
      />
    </ThreadListItemMoreSetOpenContext.Provider>
  );
};

ThreadListItemMorePrimitiveRoot.displayName =
  "ThreadListItemMorePrimitive.Root";
