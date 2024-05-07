"use client";

import { createContext, forwardRef, useContext, useMemo, useRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";

type ComposerRootElement = React.ElementRef<typeof Primitive.form>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.form>;

type ComposerRootProps = PrimitiveFormProps;

type ComposerContextValue = {
  submit: () => void;
};
const ComposerContext = createContext<ComposerContextValue | null>(null);

export const useComposerContext = () => {
  const context = useContext(ComposerContext);
  if (!context) {
    throw new Error(
      "Composer compound components cannot be rendered outside the Composer component",
    );
  }
  return context;
};

export const ComposerRoot = forwardRef<ComposerRootElement, ComposerRootProps>(
  ({ onSubmit, ...rest }, forwardedRef) => {
    const handleSubmit = useThreadContext(
      "Composer.Root",
      (s) => s.chat.handleSubmit,
    );
    const formRef = useRef<HTMLFormElement>(null);
    const ref = useComposedRefs(forwardedRef, formRef);

    const composerContextValue = useMemo(
      () => ({
        submit: () =>
          formRef.current?.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true }),
          ),
      }),
      [],
    );

    return (
      <ComposerContext.Provider value={composerContextValue}>
        <Primitive.form
          {...rest}
          ref={ref}
          onSubmit={composeEventHandlers(onSubmit, handleSubmit)}
        />
      </ComposerContext.Provider>
    );
  },
);
