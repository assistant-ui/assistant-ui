/** @vitest-environment jsdom */
import { act, render, renderHook } from "@testing-library/react";
import type { ModelContext } from "@assistant-ui/core";
import type { FormEvent, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const register = vi.fn();
  const setToolUI = vi.fn();

  return {
    register,
    setToolUI,
    aui: {
      modelContext: { register },
      tools: { setToolUI },
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
}));

import { useAssistantForm } from "./useAssistantForm";

let provider: { getModelContext: () => ModelContext };

beforeEach(() => {
  mocks.register.mockReset();
  mocks.setToolUI.mockReset();
  mocks.register.mockImplementation((value) => {
    provider = value;
    return () => {};
  });
});

const expectRegisteredFieldsToSubmit = async (Fields: () => ReactNode) => {
  const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  });

  render(
    <form onSubmit={onSubmit}>
      <Fields />
    </form>,
  );

  const submitTool = provider.getModelContext().tools?.submit_form;
  if (!submitTool?.execute) throw new Error("submit_form is not registered");

  await expect(submitTool.execute({}, {} as never)).resolves.toEqual({
    success: true,
  });
  expect(onSubmit).toHaveBeenCalledOnce();
};

describe("useAssistantForm", () => {
  it("exposes current form values to the model context", () => {
    const { result } = renderHook(() =>
      useAssistantForm<{ name: string }>({
        defaultValues: { name: "" },
      }),
    );

    expect(provider.getModelContext().system).toBe('Form State:\n{"name":""}');

    act(() => {
      result.current.setValue("name", "Ada");
    });

    expect(provider.getModelContext().system).toBe(
      'Form State:\n{"name":"Ada"}',
    );
  });

  it("submits forms registered with standard inputs", async () => {
    await expectRegisteredFieldsToSubmit(() => {
      const form = useAssistantForm<{ name: string }>();
      return <input {...form.register("name")} />;
    });
  });

  it("submits forms registered with nested inputs", async () => {
    await expectRegisteredFieldsToSubmit(() => {
      const form = useAssistantForm<{ profile: { name: string } }>();
      return <input {...form.register("profile.name")} />;
    });
  });

  it("continues to submit forms registered with grouped inputs", async () => {
    await expectRegisteredFieldsToSubmit(() => {
      const form = useAssistantForm<{ plan: string }>();
      return (
        <>
          <input type="radio" value="free" {...form.register("plan")} />
          <input type="radio" value="pro" {...form.register("plan")} />
        </>
      );
    });
  });
});
