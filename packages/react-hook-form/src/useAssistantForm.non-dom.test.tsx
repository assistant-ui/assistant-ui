/** @vitest-environment jsdom */
import { act, cleanup, render } from "@testing-library/react";
import type { ModelContext } from "@assistant-ui/core";
import { Controller } from "react-hook-form";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  vi.stubGlobal("HTMLElement", undefined);
  vi.stubGlobal("HTMLInputElement", undefined);
  return { register: vi.fn(), setToolUI: vi.fn() };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    modelContext: { register: mocks.register },
    tools: { setToolUI: mocks.setToolUI },
  }),
}));

import { useAssistantForm } from "./useAssistantForm";
import { formTools } from "./formTools";

vi.unstubAllGlobals();
afterEach(cleanup);

it.each([
  { current: 0, value: 42, expected: 42 },
  { current: false, value: true, expected: true },
  { current: "", value: 7, expected: "7" },
  { current: undefined, value: false, expected: "false" },
  { current: null, value: 7, expected: "7" },
])(
  "uses Controller value rules without DOM globals when the current value is $current",
  async ({ current, value, expected }) => {
    let provider!: { getModelContext: () => ModelContext };
    mocks.register.mockImplementation((value) => {
      provider = value;
      return () => {};
    });
    let form!: ReturnType<typeof useAssistantForm<{ value: unknown }>>;
    const Form = () => {
      form = useAssistantForm<{ value: unknown }>({
        defaultValues: { value: current },
      });
      return (
        <Controller
          control={form.control}
          name="value"
          render={({ field }) => <input ref={field.ref} />}
        />
      );
    };
    render(<Form />);
    vi.stubGlobal("HTMLElement", undefined);
    vi.stubGlobal("HTMLInputElement", undefined);

    try {
      const execute = provider.getModelContext().tools?.set_form_field?.execute;
      if (!execute) throw new Error("set_form_field is missing");
      await act(async () => {
        await expect(
          execute(
            formTools.set_form_field.parameters.parse({ name: "value", value }),
            {} as never,
          ),
        ).resolves.toEqual({ success: true });
      });
      expect(form.getValues("value")).toBe(expected);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it("reports a missing form from submit_form without DOM globals", async () => {
  let provider!: { getModelContext: () => ModelContext };
  mocks.register.mockImplementation((value) => {
    provider = value;
    return () => {};
  });
  const Form = () => {
    const form = useAssistantForm<{ name: string }>({
      defaultValues: { name: "Ada" },
    });
    return (
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => <input ref={field.ref} />}
      />
    );
  };
  render(<Form />);
  vi.stubGlobal("HTMLElement", undefined);
  vi.stubGlobal("HTMLFormElement", undefined);

  try {
    const execute = provider.getModelContext().tools?.submit_form?.execute;
    if (!execute) throw new Error("submit_form is missing");
    await act(async () => {
      await expect(
        execute({}, { human: async () => true } as never),
      ).resolves.toEqual({
        success: false,
        message: "Unable retrieve the form element. This is a coding error.",
      });
    });
  } finally {
    vi.unstubAllGlobals();
  }
});
