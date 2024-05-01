"use client";

import { forwardRef } from "react";
import { useChatWithBranches } from "../../utils/hooks/useBranches";
import { ThreadContext } from "../../utils/context/ThreadContext";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import { UseChatHelpers } from "ai/react";

type ThreadRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadRootProps = PrimitiveDivProps & {
  chat: UseChatHelpers;
};

export const ThreadRoot = forwardRef<ThreadRootElement, ThreadRootProps>(
  ({ chat, ...rest }, ref) => {
    const branches = useChatWithBranches(chat);
    return (
      <ThreadContext.Provider value={branches}>
        <Primitive.div {...rest} ref={ref} />
      </ThreadContext.Provider>
    );
  },
);
