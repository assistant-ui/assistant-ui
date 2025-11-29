"use client";

import type { FC, PropsWithChildren } from "react";
import { useAssistantState } from "../../context";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ComposerIfFilters = {
  editing: boolean | undefined;
  hasAttachments: boolean | undefined;
  isEmpty: boolean | undefined;
};

export type UseComposerIfProps = RequireAtLeastOne<ComposerIfFilters>;

const useComposerIf = (props: UseComposerIfProps) => {
  return useAssistantState(({ composer }) => {
    if (props.editing === true && !composer.isEditing) return false;
    if (props.editing === false && composer.isEditing) return false;

    if (props.hasAttachments === true && composer.attachments.length === 0)
      return false;
    if (props.hasAttachments === false && composer.attachments.length > 0)
      return false;

    if (props.isEmpty === true && !composer.isEmpty) return false;
    if (props.isEmpty === false && composer.isEmpty) return false;

    return true;
  });
};

export namespace ComposerPrimitiveIf {
  export type Props = PropsWithChildren<UseComposerIfProps>;
}

export const ComposerPrimitiveIf: FC<ComposerPrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useComposerIf(query);
  return result ? children : null;
};

ComposerPrimitiveIf.displayName = "ComposerPrimitive.If";
