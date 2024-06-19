"use client";

import {
  type ModelConfig,
  useAssistantContext,
  useAssistantToolRenderer,
} from "@assistant-ui/react/experimental";
import { useEffect } from "react";
import {
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { z } from "zod";
import type { ToolRenderComponent } from "../../react/src/model-config/ToolRenderComponent";
import { formTools } from "./formTools";

type UseAssistantFormProps<
  TFieldValues extends FieldValues,
  TContext,
> = UseFormProps<TFieldValues, TContext> & {
  assistant?: {
    tools?: {
      set_form_field?: {
        render?: ToolRenderComponent<
          z.ZodType<typeof formTools.set_form_field>,
          unknown
        >;
      };
      submit_form?: {
        render?: ToolRenderComponent<
          z.ZodType<typeof formTools.submit_form>,
          unknown
        >;
      };
    };
  };
};

export const useAssistantForm = <
  TFieldValues extends FieldValues = FieldValues,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined,
>(
  props?: UseAssistantFormProps<TFieldValues, TContext>,
): UseFormReturn<TFieldValues, TContext, TTransformedValues> => {
  const form = useForm<TFieldValues, TContext, TTransformedValues>(props);

  const { useModelConfig } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (c) => c.registerModelConfigProvider,
  );

  useEffect(() => {
    const value: ModelConfig = {
      system: `Form State:\n${JSON.stringify(form.getValues())}`,

      tools: {
        set_form_field: {
          ...formTools.set_form_field,
          execute: async (args) => {
            // biome-ignore lint/suspicious/noExplicitAny: TODO
            form.setValue(args.name as any, args.value as any);

            return { success: true };
          },
        },
        submit_form: {
          ...formTools.submit_form,
          execute: async () => {
            const { _names, _fields } = form.control;
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
    return registerModelConfigProvider(() => value);
  }, [
    form.control,
    form.setValue,
    form.getValues,
    registerModelConfigProvider,
  ]);

  const renderFormFieldTool = props?.assistant?.tools?.set_form_field?.render;
  useAssistantToolRenderer(
    renderFormFieldTool
      ? {
          name: "set_form_field",
          render: renderFormFieldTool,
        }
      : null,
  );

  const renderSubmitFormTool = props?.assistant?.tools?.submit_form?.render;
  useAssistantToolRenderer(
    renderSubmitFormTool
      ? {
          name: "submit_form",
          render: renderSubmitFormTool,
        }
      : null,
  );

  return form;
};
