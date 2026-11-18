/** @vitest-environment jsdom */
import { render, renderHook, waitFor } from "@testing-library/react";
import type { ModelContext } from "@assistant-ui/core";
import type { FieldErrors, Resolver } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const register = vi.fn();

  return {
    register,
    aui: {
      modelContext: { register },
      tools: { setToolUI: vi.fn() },
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
}));

import { formTools } from "./formTools";
import { useAssistantForm } from "./useAssistantForm";

let provider: { getModelContext: () => ModelContext };

beforeEach(() => {
  mocks.register.mockReset();
  mocks.register.mockImplementation((value) => {
    provider = value;
    return () => {};
  });
});

const executeSetFormField = (args: { name: string; value: unknown }) => {
  const formTool = provider.getModelContext().tools?.["set_form_field"];
  if (!formTool?.execute) throw new Error("set_form_field is not registered");
  return formTool.execute(args as never, { human: async () => true } as never);
};

type FormValues = { name: string; age: number; newsletter: boolean };

const typedResolver: Resolver<FormValues> = (values) => {
  const errors: FieldErrors<FormValues> = {};
  if (typeof values.name !== "string") {
    errors.name = { type: "type", message: "name must be a string" };
  }
  if (typeof values.age !== "number") {
    errors.age = { type: "type", message: "age must be a number" };
  }
  if (typeof values.newsletter !== "boolean") {
    errors.newsletter = {
      type: "type",
      message: "newsletter must be a boolean",
    };
  }
  if (Object.keys(errors).length > 0)
    return Promise.resolve({ values: {} as FormValues, errors });
  return Promise.resolve({ values, errors: {} });
};

describe("set_form_field values", () => {
  it("accepts the value types a form field holds", () => {
    const parameters = formTools.set_form_field.parameters;

    expect(parameters.safeParse({ name: "age", value: 42 }).success).toBe(true);
    expect(
      parameters.safeParse({ name: "newsletter", value: true }).success,
    ).toBe(true);
    expect(parameters.safeParse({ name: "name", value: "Ada" }).success).toBe(
      true,
    );
    expect(parameters.safeParse({ name: "name", value: null }).success).toBe(
      false,
    );
  });

  it("writes a typed value that stays valid for the form's resolver", async () => {
    let form!: ReturnType<typeof useAssistantForm<FormValues>>;
    renderHook(() => {
      form = useAssistantForm<FormValues>({
        defaultValues: { name: "", age: 0, newsletter: false },
        resolver: typedResolver,
      });
    });

    await executeSetFormField({ name: "name", value: "Ada" });
    await executeSetFormField({ name: "age", value: 42 });
    await executeSetFormField({ name: "newsletter", value: true });

    expect(form.getValues()).toEqual({
      name: "Ada",
      age: 42,
      newsletter: true,
    });
    await waitFor(async () => expect(await form.trigger()).toBe(true));
  });

  it("keeps a number field invalid when the model can only send a string", async () => {
    let form!: ReturnType<typeof useAssistantForm<FormValues>>;
    const Form = () => {
      form = useAssistantForm<FormValues>({
        defaultValues: { name: "Ada", age: 0, newsletter: false },
        resolver: typedResolver,
      });
      return (
        <form>
          <input type="number" {...form.register("age")} />
        </form>
      );
    };
    render(<Form />);

    await executeSetFormField({ name: "age", value: "42" });

    expect(form.getValues("age")).toBe("42");
    await waitFor(async () => expect(await form.trigger()).toBe(false));
  });
});
