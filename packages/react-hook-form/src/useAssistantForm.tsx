"use client";

import {
  type ModelConfig,
  type ToolCallContentPartComponent,
  useAssistantContext,
  useAssistantToolUI,
} from "@assistant-ui/react";
import { useEffect } from "react";
import {
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { z } from "zod";
import { formTools } from "./formTools";

export type UseAssistantFormProps<
  TFieldValues extends FieldValues,
  TContext,
> = UseFormProps<TFieldValues, TContext> & {
  assistant?:
    | {
        tools?:
          | {
              set_form_field?:
                | {
                    render?:
                      | ToolCallContentPartComponent<
                          z.ZodType<typeof formTools.set_form_field>,
                          unknown
                        >
                      | undefined;
                  }
                | undefined;
              submit_form?:
                | {
                    render?:
                      | ToolCallContentPartComponent<
                          z.ZodType<typeof formTools.submit_form>,
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
  TTransformedValues extends FieldValues | undefined = undefined,
>(
  props?: UseAssistantFormProps<TFieldValues, TContext>,
): UseFormReturn<TFieldValues, TContext, TTransformedValues> => {
  const form = useForm<TFieldValues, TContext, TTransformedValues>(props);
  const { control, getValues, setValue } = form;

  const { useModelConfig } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (c) => c.registerModelConfigProvider,
  );

  useEffect(() => {
    const value: ModelConfig = {
      system: `Form State:\n${JSON.stringify(getValues())}`,

      tools: {
        set_form_field: {
          ...formTools.set_form_field,
          execute: async (args) => {
            setValue(args.name, args.value);

            return { success: true };
          },
        },
        submit_form: {
          ...formTools.submit_form,
          execute: async () => {
            const { _names, _fields } = control;
            for (const name of _names.mount) {
              const field = _fields[name];
              if (field?._f) {
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
        },
      },
    };
    return registerModelConfigProvider({ getModelConfig: () => value });
  }, [control, setValue, getValues, registerModelConfigProvider]);

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

  return form;
};
