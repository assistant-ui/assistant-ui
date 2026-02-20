"use client";

import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ComposerIfFilters = {
  /** Whether the composer is in editing mode */
  editing: boolean | undefined;
  /** Whether dictation is currently active */
  dictation: boolean | undefined;
};

export type UseComposerIfProps = RequireAtLeastOne<ComposerIfFilters>;

const useComposerIf = (props: UseComposerIfProps) => {
  return useAuiState((s) => {
    if (props.editing === true && !s.composer.isEditing) return false;
    if (props.editing === false && s.composer.isEditing) return false;

    const isDictating = s.composer.dictation != null;
    if (props.dictation === true && !isDictating) return false;
    if (props.dictation === false && isDictating) return false;

    return true;
  });
};

export namespace ComposerPrimitiveIf {
  export type Props = PropsWithChildren<UseComposerIfProps>;
}

/**
 * @deprecated Use `<AuiIf condition={(s) => s.composer...} />` instead.
 */
export const ComposerPrimitiveIf: FC<ComposerPrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useComposerIf(query);
  return result ? children : null;
};

ComposerPrimitiveIf.displayName = "ComposerPrimitive.If";
