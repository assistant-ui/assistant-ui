"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import {
  type FormEvent,
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useComposerContext } from "../../utils/context/useComposerContext";

type ComposerRootElement = React.ElementRef<typeof Primitive.form>;
type PrimitiveFormProps = ComponentPropsWithoutRef<typeof Primitive.form>;

type ComposerRootProps = PrimitiveFormProps;

type ComposerContextValue = {
  submit: () => void;
};
const ComposerFormContext = createContext<ComposerContextValue | null>(null);

export const useComposerFormContext = () => {
  const context = useContext(ComposerFormContext);
  if (!context) {
    throw new Error(
      "Composer compound components cannot be rendered outside the Composer component",
    );
  }
  return context;
};

export const ComposerRoot = forwardRef<ComposerRootElement, ComposerRootProps>(
  ({ onSubmit, ...rest }, forwardedRef) => {
    const { useComposer } = useComposerContext();

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

    const handleSubmit = (e: FormEvent) => {
      const composerState = useComposer.getState();
      if (!composerState.isEditing) return;

      e.preventDefault();
      composerState.send();
    };

    return (
      <ComposerFormContext.Provider value={composerContextValue}>
        <Primitive.form
          {...rest}
          ref={ref}
          onSubmit={composeEventHandlers(onSubmit, handleSubmit)}
        />
      </ComposerFormContext.Provider>
    );
  },
);
