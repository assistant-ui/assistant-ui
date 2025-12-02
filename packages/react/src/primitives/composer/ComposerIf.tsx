"use client";

import type { FC, PropsWithChildren } from "react";
import { useAssistantState } from "../../context";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ComposerIfFilters = {
  /** Whether the composer is in editing mode */
  editing: boolean | undefined;
  /** Whether speech recognition (dictation) is currently active */
  listening: boolean | undefined;
};

export type UseComposerIfProps = RequireAtLeastOne<ComposerIfFilters>;

const useComposerIf = (props: UseComposerIfProps) => {
  return useAssistantState(({ composer }) => {
    if (props.editing === true && !composer.isEditing) return false;
    if (props.editing === false && composer.isEditing) return false;

    const isListening = composer.listening != null;
    if (props.listening === true && !isListening) return false;
    if (props.listening === false && isListening) return false;

    return true;
  });
};

export namespace ComposerPrimitiveIf {
  export type Props = PropsWithChildren<UseComposerIfProps>;
}

/**
 * @deprecated Use `<AssistantIf condition={({ composer }) => ...} />` instead.
 */
export const ComposerPrimitiveIf: FC<ComposerPrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useComposerIf(query);
  return result ? children : null;
};

ComposerPrimitiveIf.displayName = "ComposerPrimitive.If";
