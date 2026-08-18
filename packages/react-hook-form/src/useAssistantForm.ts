"use client";

import { type ModelContext, tool } from "@assistant-ui/core";
import type {} from "@assistant-ui/core/store";
import { type ToolCallMessagePartComponent } from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type Field,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormProps,
  type UseFormReturn,
  get,
  useForm,
} from "react-hook-form";
import type { z } from "zod";
import { formTools } from "./formTools";

type PendingAssistantSubmit = {
  dispatching: boolean;
  event: unknown;
  handlerInvoked: boolean;
  outcome: boolean | undefined;
  resolve: (outcome: boolean) => void;
  reject: (error: unknown) => void;
};

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
    handleSubmit: baseHandleSubmit,
    formState: { isSubmitting },
  } = form;

  const pendingAssistantSubmitRef = useRef<PendingAssistantSubmit | null>(null);
  const settleAssistantSubmit = useCallback((outcome: boolean) => {
    const pending = pendingAssistantSubmitRef.current;
    if (!pending) return;

    pendingAssistantSubmitRef.current = null;
    pending.resolve(outcome);
  }, []);
  const rejectAssistantSubmit = useCallback((error: unknown) => {
    const pending = pendingAssistantSubmitRef.current;
    if (!pending) return;

    pendingAssistantSubmitRef.current = null;
    pending.reject(error);
  }, []);

  const handleSubmit = useCallback<
    UseFormReturn<TFieldValues, TContext, TTransformedValues>["handleSubmit"]
  >(
    (onValid, onInvalid) => {
      const submit = baseHandleSubmit(
        (...args) => {
          const pending = pendingAssistantSubmitRef.current;
          const event = args[1]?.nativeEvent ?? args[1];
          if (pending && pending.event === event) pending.outcome = true;
          return onValid(...args);
        },
        (...args) => {
          const pending = pendingAssistantSubmitRef.current;
          const event = args[1]?.nativeEvent ?? args[1];
          if (pending && pending.event === event) pending.outcome = false;
          return onInvalid?.(...args);
        },
      );

      return (async (event) => {
        const pending = pendingAssistantSubmitRef.current;
        const nativeEvent = event?.nativeEvent ?? event;
        const assistantSubmit =
          pending &&
          (pending.event === nativeEvent ||
            (pending.dispatching &&
              pending.event === undefined &&
              nativeEvent !== undefined))
            ? pending
            : null;
        if (assistantSubmit) {
          assistantSubmit.event = nativeEvent;
          assistantSubmit.handlerInvoked = true;
        }

        try {
          const result = await submit(event);
          if (
            assistantSubmit &&
            pendingAssistantSubmitRef.current === assistantSubmit
          ) {
            settleAssistantSubmit(assistantSubmit.outcome ?? true);
          }
          return result;
        } catch (error) {
          if (pendingAssistantSubmitRef.current === assistantSubmit) {
            rejectAssistantSubmit(error);
          }
          throw error;
        }
      }) as typeof submit;
    },
    [baseHandleSubmit, rejectAssistantSubmit, settleAssistantSubmit],
  );
  const assistantForm = useMemo<
    UseFormReturn<TFieldValues, TContext, TTransformedValues>
  >(
    () => ({
      ...form,
      handleSubmit,
      get formState() {
        return form.formState;
      },
    }),
    [form, handleSubmit],
  );

  const aui = useAui();
  useEffect(() => {
    const value: ModelContext = {
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
            if (isSubmitting || pendingAssistantSubmitRef.current) {
              return {
                success: false,
                message: "The form is already submitting.",
              };
            }
            const { _names, _fields } = control;
            let formElement: HTMLFormElement | null = null;
            for (const name of _names.mount) {
              const field: Field | undefined = get(_fields, name);
              if (field?._f) {
                const fieldReference = Array.isArray(field._f.refs)
                  ? field._f.refs[0]
                  : field._f.ref;

                if (fieldReference instanceof HTMLElement) {
                  formElement = fieldReference.closest("form");
                  if (formElement) break;
                }
              }
            }

            if (formElement) {
              if (!formElement.noValidate && !formElement.reportValidity()) {
                return {
                  success: false,
                  message:
                    "The form contains invalid fields and was not submitted.",
                };
              }

              let resolveSubmission: (outcome: boolean) => void = () => {};
              let rejectSubmission: (error: unknown) => void = () => {};
              const submissionResult = new Promise<boolean>(
                (resolve, reject) => {
                  resolveSubmission = resolve;
                  rejectSubmission = reject;
                },
              );
              const assistantSubmit: PendingAssistantSubmit = {
                dispatching: true,
                event: undefined,
                handlerInvoked: false,
                outcome: undefined,
                resolve: resolveSubmission,
                reject: rejectSubmission,
              };
              pendingAssistantSubmitRef.current = assistantSubmit;
              const onSubmit = (event: SubmitEvent) => {
                if (
                  pendingAssistantSubmitRef.current === assistantSubmit &&
                  assistantSubmit.event === undefined
                ) {
                  assistantSubmit.event = event;
                }
                queueMicrotask(() => {
                  if (
                    pendingAssistantSubmitRef.current === assistantSubmit &&
                    !assistantSubmit.handlerInvoked
                  ) {
                    settleAssistantSubmit(true);
                  }
                });
              };

              formElement.addEventListener("submit", onSubmit, { once: true });
              try {
                formElement.requestSubmit();
              } catch (error) {
                settleAssistantSubmit(false);
                throw error;
              } finally {
                assistantSubmit.dispatching = false;
                formElement.removeEventListener("submit", onSubmit);
              }

              const dispatched = assistantSubmit.event !== undefined;
              if (!dispatched) {
                settleAssistantSubmit(false);
              }

              if (await submissionResult) return { success: true };
              return {
                success: false,
                message: dispatched
                  ? "The form contains invalid fields and was not submitted."
                  : "The form did not accept the submission.",
              };
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

    return aui.modelContext.register({
      getModelContext: () => ({
        ...value,
        system: `Form State:\n${JSON.stringify(getValues())}`,
      }),
    });
  }, [
    control,
    setValue,
    getValues,
    aui,
    reset,
    isSubmitting,
    rejectAssistantSubmit,
    settleAssistantSubmit,
  ]);

  const renderFormFieldTool = props?.assistant?.tools?.set_form_field?.render;
  useEffect(() => {
    if (!renderFormFieldTool) return undefined;
    return aui.tools.setToolUI("set_form_field", renderFormFieldTool);
  }, [aui, renderFormFieldTool]);

  const renderSubmitFormTool = props?.assistant?.tools?.submit_form?.render;
  useEffect(() => {
    if (!renderSubmitFormTool) return undefined;
    return aui.tools.setToolUI("submit_form", renderSubmitFormTool);
  }, [aui, renderSubmitFormTool]);

  const renderResetFormTool = props?.assistant?.tools?.reset_form?.render;
  useEffect(() => {
    if (!renderResetFormTool) return undefined;
    return aui.tools.setToolUI("reset_form", renderResetFormTool);
  }, [aui, renderResetFormTool]);

  return assistantForm;
};
