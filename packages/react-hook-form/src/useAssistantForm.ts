"use client";

import {
  type ModelContext,
  tool,
  type ToolCallMessagePartComponent,
  useAui,
  useAssistantToolUI,
} from "@assistant-ui/react";
import { useEffect } from "react";
import {
  type FieldValues,
  Path,
  PathValue,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { z } from "zod";
import { formTools } from "./formTools";

export type UseAssistantFormProps<
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues,
> = UseFormProps<TFieldValues, TContext, TTransformedValues> & {
  assistant?:
    | {
        tools?:
          | {
              set_form_field?:
                | {
                    render?:
                      | ToolCallMessagePartComponent<
                          z.infer<
                            (typeof formTools.set_form_field)["parameters"]
                          >,
                          unknown
                        >
                      | undefined;
                  }
                | undefined;
              submit_form?:
                | {
                    render?:
                      | ToolCallMessagePartComponent<
                          z.infer<(typeof formTools.submit_form)["parameters"]>,
                          unknown
                        >
                      | undefined;
                  }
                | undefined;
              reset_form?:
                | {
                    render?:
                      | ToolCallMessagePartComponent<
                          z.infer<(typeof formTools.reset_form)["parameters"]>,
                          unknown
                        >
                      | undefined;
                  }
                | undefined;
            }
          | undefined;
      }
    | undefined;
};

export const useAssistantForm = <
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(
  props?: UseAssistantFormProps<TFieldValues, TContext, TTransformedValues>,
): UseFormReturn<TFieldValues, TContext, TTransformedValues> => {
  const form = useForm<TFieldValues, TContext, TTransformedValues>(props);
  const {
    control,
    getValues,
    setValue,
    reset,
    formState: { isSubmitting },
  } = form;

  const aui = useAui();
  useEffect(() => {
    const value: ModelContext = {
      system: `Form State:\n${JSON.stringify(getValues())}`,

      tools: {
        set_form_field: tool({
          ...formTools.set_form_field,
          parameters: formTools.set_form_field.parameters,
          execute: async (args) => {
            setValue(
              args.name as Path<TFieldValues>,
              args.value as PathValue<TFieldValues, Path<TFieldValues>>,
            );

            return { success: true };
          },
        }),
        submit_form: tool({
          ...formTools.submit_form,
          execute: async () => {
            if (isSubmitting) {
              return {
                success: false,
                message: "The form is already submitting.",
              };
            }
            const { _names, _fields } = control;
            for (const name of _names.mount) {
              const field = _fields[name];
              if (field?._f && "refs" in field._f) {
                const fieldReference = Array.isArray(field._f.refs)
                  ? field._f.refs[0]
                  : field._f.ref;

                if (fieldReference instanceof HTMLElement) {
                  const form = fieldReference.closest("form");
                  if (form) {
                    form.requestSubmit();

                    return { success: true };
                  }
                }
              }
            }

            return {
              success: false,
              message:
                "Unable retrieve the form element. This is a coding error.",
            };
          },
        }),
        reset_form: tool({
          ...formTools.reset_form,
          execute: async () => {
            reset();
            return { success: true };
          },
        }),
      },
    };
    return aui.modelContext().register({
      getModelContext: () => value,
    });
  }, [control, setValue, getValues, aui, reset, isSubmitting]);

  const renderFormFieldTool = props?.assistant?.tools?.set_form_field?.render;
  useAssistantToolUI(
    renderFormFieldTool
      ? {
          toolName: "set_form_field",
          render: renderFormFieldTool,
        }
      : null,
  );

  const renderSubmitFormTool = props?.assistant?.tools?.submit_form?.render;
  useAssistantToolUI(
    renderSubmitFormTool
      ? {
          toolName: "submit_form",
          render: renderSubmitFormTool,
        }
      : null,
  );

  const renderResetFormTool = props?.assistant?.tools?.reset_form?.render;
  useAssistantToolUI(
    renderResetFormTool
      ? {
          toolName: "reset_form",
          render: renderResetFormTool,
        }
      : null,
  );

  return form;
};
