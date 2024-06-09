"use client";

import type { FC, PropsWithChildren } from "react";
import { useComposerContext } from "../../context/ComposerContext";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ComposerIfFilters = {
  editing: boolean | undefined;
};

type ComposerIfProps = PropsWithChildren<RequireAtLeastOne<ComposerIfFilters>>;

const useComposerIf = (props: RequireAtLeastOne<ComposerIfFilters>) => {
  const { useComposer } = useComposerContext();
  return useComposer((composer) => {
    if (props.editing === true && !composer.isEditing) return false;
    if (props.editing === false && composer.isEditing) return false;

    return true;
  });
};

export const ComposerIf: FC<ComposerIfProps> = ({ children, ...query }) => {
  const result = useComposerIf(query);
  return result ? children : null;
};
