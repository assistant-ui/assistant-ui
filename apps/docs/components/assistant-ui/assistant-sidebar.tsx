import { Separator, ResizablePanel, Group } from "@/components/ui/resizable";
import type { FC, PropsWithChildren } from "react";

import { Thread } from "@/components/assistant-ui/thread";

export const AssistantSidebar: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Group orientation="horizontal">
      <ResizablePanel>{children}</ResizablePanel>
      <Separator />
      <ResizablePanel>
        <Thread />
      </ResizablePanel>
    </Group>
  );
};
