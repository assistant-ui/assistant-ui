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

const ThreadListItemMoreSharedFocusGroupContext = createContext(false);

export const useThreadListItemMoreSharedFocusGroup = (): boolean =>
  useContext(ThreadListItemMoreSharedFocusGroupContext);

export namespace ThreadListItemMorePrimitiveRoot {
  export type Props = DropdownMenuPrimitive.DropdownMenuProps & {
    /**
     * Join the menu to the thread list's focus group: Right opens it, Left/Escape
     * close it and return focus to the trigger (mirrored in RTL). Forces the menu
     * non-modal, since a focus trap can't let focus cross the trigger/menu
     * boundary. Defaults to a standalone modal dropdown.
     */
    sharedFocusGroup?: boolean | undefined;
  };
}

/**
 * Root container for the overflow menu, built on Radix DropdownMenu.
 *
 * Defaults to a standard, self-contained modal dropdown. Pass
 * {@link ThreadListItemMorePrimitiveRoot.Props.sharedFocusGroup} to fold it into
 * the thread list's keyboard navigation instead.
 */
export const ThreadListItemMorePrimitiveRoot: FC<
  ThreadListItemMorePrimitiveRoot.Props
> = ({
  __scopeThreadListItemMore,
  open: openProp,
  defaultOpen,
  onOpenChange,
  sharedFocusGroup = false,
  modal: modalProp,
  ...rest
}: ScopedProps<ThreadListItemMorePrimitiveRoot.Props>) => {
  const modal = sharedFocusGroup ? false : (modalProp ?? true);
  const scope = useDropdownMenuScope(__scopeThreadListItemMore);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    caller: "ThreadListItemMorePrimitive.Root",
    ...(onOpenChange ? { onChange: onOpenChange } : {}),
  });

  return (
    <ThreadListItemMoreSharedFocusGroupContext.Provider
      value={sharedFocusGroup}
    >
      <ThreadListItemMoreSetOpenContext.Provider value={setOpen}>
        <DropdownMenuPrimitive.Root
          {...scope}
          {...rest}
          modal={modal}
          open={open}
          onOpenChange={setOpen}
        />
      </ThreadListItemMoreSetOpenContext.Provider>
    </ThreadListItemMoreSharedFocusGroupContext.Provider>
  );
};

ThreadListItemMorePrimitiveRoot.displayName =
  "ThreadListItemMorePrimitive.Root";
