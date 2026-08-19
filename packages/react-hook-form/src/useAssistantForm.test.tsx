/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import type { ModelContext } from "@assistant-ui/core";
import type { FormEvent, ReactNode } from "react";
import type { Resolver, ResolverResult } from "react-hook-form";
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

const executeSubmitForm = () => {
  const submitTool = provider.getModelContext().tools?.submit_form;
  if (!submitTool?.execute) throw new Error("submit_form is not registered");
  return submitTool.execute({}, {} as never);
};

const expectSubmitBlocked = async () => {
  await expect(executeSubmitForm()).resolves.toEqual({
    success: false,
    message: "The form contains invalid fields and was not submitted.",
  });
};

const expectRegisteredFieldsToSubmit = async (Fields: () => ReactNode) => {
  const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  });

  render(
    <form onSubmit={onSubmit}>
      <Fields />
    </form>,
  );

  await expect(executeSubmitForm()).resolves.toEqual({
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

  it("reports when native form validation blocks submission", async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <form onSubmit={onSubmit}>
        <NativeRequiredField />
      </form>,
    );

    await expectSubmitBlocked();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when native form validation is disabled", async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <form noValidate onSubmit={onSubmit}>
        <NativeRequiredField />
      </form>,
    );

    await expect(executeSubmitForm()).resolves.toEqual({
      success: true,
    });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("submits a form with react-hook-form rules and a plain onSubmit", async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    const Fields = () => {
      const form = useAssistantForm<{ name: string }>();
      return <input {...form.register("name", { required: true })} />;
    };

    render(
      <form onSubmit={onSubmit}>
        <Fields />
      </form>,
    );

    await expect(executeSubmitForm()).resolves.toEqual({ success: true });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("reports when react-hook-form validation blocks submission", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { getByTestId } = render(
      <ReactHookFormRequiredForm onInvalid={onInvalid} onValid={onValid} />,
    );

    await expectSubmitBlocked();
    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(getByTestId("submit-count").textContent).toBe("1");
      expect(getByTestId("name-error").textContent).toBe("invalid");
    });

    fireEvent.change(getByTestId("name-input"), {
      target: { value: "Ada" },
    });
    await waitFor(() => {
      expect(getByTestId("name-error").textContent).toBe("valid");
    });
  });

  it("reports validation blocked by a capture-phase handler", async () => {
    const onValid = vi.fn();

    render(<ReactHookFormRequiredForm capture onValid={onValid} />);

    await expectSubmitBlocked();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("reports react-hook-form errors when native validation is disabled", async () => {
    const onValid = vi.fn();

    render(<ReactHookFormRequiredForm noValidate onValid={onValid} />);

    await expectSubmitBlocked();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("submits forms that pass react-hook-form validation", async () => {
    const onValid = vi.fn();

    render(<ReactHookFormRequiredForm defaultName="Ada" onValid={onValid} />);

    await expect(executeSubmitForm()).resolves.toEqual({ success: true });
    await waitFor(() => expect(onValid).toHaveBeenCalledOnce());
  });

  it("does not let user submissions settle a pending assistant submission", async () => {
    type FormValues = { name: string };
    let validationCount = 0;
    let resolveAssistantValidation: (
      result: ResolverResult<FormValues>,
    ) => void = () => {};
    const resolver: Resolver<FormValues> = (values) => {
      validationCount += 1;
      if (validationCount === 1) {
        return new Promise((resolve) => {
          resolveAssistantValidation = resolve;
        });
      }
      return Promise.resolve({ values, errors: {} });
    };
    const onValid = vi.fn();

    const Form = () => {
      const form = useAssistantForm<FormValues>({
        defaultValues: { name: "" },
        resolver,
      });
      return (
        <form
          data-testid="concurrent-form"
          onSubmit={form.handleSubmit(onValid)}
        >
          <input data-testid="concurrent-name" {...form.register("name")} />
        </form>
      );
    };
    const { getByTestId } = render(<Form />);

    let assistantSubmitSettled = false;
    const assistantSubmit = executeSubmitForm().finally(() => {
      assistantSubmitSettled = true;
    });
    await waitFor(() => expect(validationCount).toBe(1));

    fireEvent.change(getByTestId("concurrent-name"), {
      target: { value: "Ada" },
    });
    fireEvent.submit(getByTestId("concurrent-form"));
    await waitFor(() => {
      expect(validationCount).toBe(2);
      expect(onValid).toHaveBeenCalledOnce();
    });
    expect(assistantSubmitSettled).toBe(false);

    resolveAssistantValidation({
      values: {},
      errors: { name: { type: "required", message: "Name is required" } },
    });
    await expect(assistantSubmit).resolves.toEqual({
      success: false,
      message: "The form contains invalid fields and was not submitted.",
    });
  });

  it("reports when requestSubmit does not dispatch a submit event", async () => {
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});
    try {
      render(
        <form noValidate>
          <NativeRequiredField />
        </form>,
      );

      await expect(executeSubmitForm()).resolves.toEqual({
        success: false,
        message: "The form did not accept the submission.",
      });
    } finally {
      requestSubmit.mockRestore();
    }
  });

  it("propagates errors when requestSubmit throws", async () => {
    const error = new Error("requestSubmit unavailable");
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {
        throw error;
      });
    try {
      render(
        <form noValidate>
          <NativeRequiredField />
        </form>,
      );

      await expect(executeSubmitForm()).rejects.toBe(error);
    } finally {
      requestSubmit.mockRestore();
    }
  });
});

const NativeRequiredField = () => {
  const form = useAssistantForm<{ name: string }>();
  return <input required {...form.register("name")} />;
};

const ReactHookFormRequiredForm = ({
  capture = false,
  defaultName = "",
  onInvalid,
  onValid,
  noValidate,
}: {
  capture?: boolean | undefined;
  defaultName?: string | undefined;
  onInvalid?: (() => void) | undefined;
  onValid: () => void;
  noValidate?: boolean | undefined;
}) => {
  const form = useAssistantForm<{ name: string }>({
    defaultValues: { name: defaultName },
  });
  const handleSubmit = form.handleSubmit(onValid, onInvalid);
  return (
    <form
      noValidate={noValidate}
      onSubmit={capture ? undefined : handleSubmit}
      onSubmitCapture={capture ? handleSubmit : undefined}
    >
      <input
        data-testid="name-input"
        {...form.register("name", { required: true })}
      />
      <output data-testid="submit-count">{form.formState.submitCount}</output>
      <output data-testid="name-error">
        {form.formState.errors.name ? "invalid" : "valid"}
      </output>
    </form>
  );
};
