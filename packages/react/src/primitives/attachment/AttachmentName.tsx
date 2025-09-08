"use client";

import type { FC } from "react";
import { useAssistantState } from "../../context";

export namespace AttachmentPrimitiveName {
  export type Props = Record<string, never>;
}

export const AttachmentPrimitiveName: FC<
  AttachmentPrimitiveName.Props
> = () => {
  const name = useAssistantState(({ attachment }) => attachment.name);
  return <>{name}</>;
};

AttachmentPrimitiveName.displayName = "AttachmentPrimitive.Name";
