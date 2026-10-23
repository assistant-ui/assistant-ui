/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import type { ModelContext } from "@assistant-ui/core";
import type { FormEvent, ReactNode } from "react";
import type { Resolver, ResolverResult } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

afterEach(cleanup);

beforeEach(() => {
  mocks.register.mockReset();
  mocks.setToolUI.mockReset();
  mocks.register.mockImplementation((value) => {
    provider = value;
    return () => {};
  });
});

const executeFormTool = (
  name: "submit_form" | "reset_form",
  context: unknown = { human: async () => true },
) => {
  const formTool = provider.getModelContext().tools?.[name];
  if (!formTool?.execute) throw new Error(`${name} is not registered`);
  return formTool.execute({}, context as never);
};

const executeSubmitForm = () => executeFormTool("submit_form");

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
  it.each(["submit_form", "reset_form"] as const)(
    "asks before %s and leaves the form unchanged when denied",
    async (name) => {
      let decide!: (value: unknown) => void;
      const human = vi.fn(
        () =>
          new Promise<unknown>((resolve) => {
            decide = resolve;
          }),
      );
      const submitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
        event.preventDefault(),
      );
      const Form = () => {
        const form = useAssistantForm({ defaultValues: { name: "Ada" } });
        return <input {...form.register("name")} />;
      };
      const { container } = render(
        <form onSubmit={submitted}>
          <Form />
        </form>,
      );
      const input = container.querySelector("input")!;
      fireEvent.change(input, { target: { value: "Grace" } });

      const execution = executeFormTool(name, { human });
      expect(human).toHaveBeenCalledWith({
        type: name === "submit_form" ? "form-submit" : "form-reset",
      });
      expect(submitted).not.toHaveBeenCalled();
      expect(input.value).toBe("Grace");

      decide({ approved: false });
      await expect(execution).resolves.toEqual({
        success: false,
        message: "The user declined.",
      });
      expect(submitted).not.toHaveBeenCalled();
      expect(input.value).toBe("Grace");
    },
  );

  it.each(["submit_form", "reset_form"] as const)(
    "runs %s when approval is disabled",
    async (name) => {
      const submitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
        event.preventDefault(),
      );
      let form!: ReturnType<typeof useAssistantForm<{ name: string }>>;
      const Form = () => {
        form = useAssistantForm({
          defaultValues: { name: "Ada" },
          assistant: { tools: { [name]: { requireApproval: false } } },
        });
        return <input {...form.register("name")} />;
      };
      const { container } = render(
        <form onSubmit={submitted}>
          <Form />
        </form>,
      );
      const input = container.querySelector("input")!;
      fireEvent.change(input, { target: { value: "Grace" } });

      await expect(executeFormTool(name, {})).resolves.toEqual({
        success: true,
      });
      expect(submitted).toHaveBeenCalledTimes(name === "submit_form" ? 1 : 0);
      expect(form.getValues("name")).toBe(
        name === "reset_form" ? "Ada" : "Grace",
      );
    },
  );

  it("resets after object approval", async () => {
    let form!: ReturnType<typeof useAssistantForm<{ name: string }>>;
    renderHook(() => {
      form = useAssistantForm({ defaultValues: { name: "Ada" } });
    });
    act(() => form.setValue("name", "Grace"));
    const human = vi.fn(async () => ({ approved: true }));

    await expect(executeFormTool("reset_form", { human })).resolves.toEqual({
      success: true,
    });
    expect(human).toHaveBeenCalledWith({ type: "form-reset" });
    expect(form.getValues("name")).toBe("Ada");
  });

  it("submits after boolean approval", async () => {
    const human = vi.fn(async () => true);
    const submitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );
    render(
      <form onSubmit={submitted}>
        <NativeRequiredField />
      </form>,
    );
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "Ada" } });

    await expect(executeFormTool("submit_form", { human })).resolves.toEqual({
      success: true,
    });
    expect(human).toHaveBeenCalledWith({ type: "form-submit" });
    expect(submitted).toHaveBeenCalledOnce();
  });

  it("propagates a rejected approval request", async () => {
    renderHook(() => useAssistantForm());
    const error = new Error("approval unavailable");
    await expect(
      executeFormTool("reset_form", {
        human: async () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);
  });

  it("propagates a submit_form human rejection without submitting", async () => {
    const submitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );
    render(
      <form onSubmit={submitted}>
        <NativeRequiredField />
      </form>,
    );
    const error = new Error(
      "Tool interrupt is not supported in data stream runtime",
    );

    await expect(
      executeFormTool("submit_form", {
        human: async () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);
    expect(submitted).not.toHaveBeenCalled();
  });

  it("does not submit again after a manual submit while approval is pending", async () => {
    let decide!: (value: unknown) => void;
    const human = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          decide = resolve;
        }),
    );
    const onValid = vi.fn();
    const Form = () => {
      const form = useAssistantForm({ defaultValues: { name: "Ada" } });
      return (
        <form onSubmit={form.handleSubmit(onValid)}>
          <input {...form.register("name")} />
        </form>
      );
    };
    const { container } = render(<Form />);

    const execution = executeFormTool("submit_form", { human });
    expect(human).toHaveBeenCalledWith({ type: "form-submit" });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(onValid).toHaveBeenCalledOnce());

    decide(true);
    await expect(execution).resolves.toEqual({
      success: false,
      message: "The form is already submitting.",
    });
    expect(onValid).toHaveBeenCalledOnce();
  });

  it("omits sensitive fields from the model context", () => {
    const Form = () => {
      const form = useAssistantForm({
        defaultValues: {
          profile: { name: "Ada", password: "secret" },
          current: "old-secret",
          newPassword: "new-secret",
          code: "123456",
          card: "4242424242424242",
        },
      });
      return (
        <>
          <input {...form.register("profile.name")} />
          <input type="password" {...form.register("profile.password")} />
          <input
            autoComplete="current-password"
            {...form.register("current")}
          />
          <input
            autoComplete="new-password"
            {...form.register("newPassword")}
          />
          <input autoComplete="one-time-code" {...form.register("code")} />
          <input autoComplete="cc-number" {...form.register("card")} />
        </>
      );
    };
    render(<Form />);

    expect(provider.getModelContext().system).toBe(
      'Form State:\n{"profile":{"name":"Ada"}}',
    );
  });

  it("keeps an unmounted password field out of the model context", () => {
    let form!: ReturnType<
      typeof useAssistantForm<{ name: string; password: string }>
    >;
    const Form = ({ showPassword }: { showPassword: boolean }) => {
      form = useAssistantForm({
        defaultValues: { name: "Ada", password: "secret" },
      });
      return (
        <>
          <input {...form.register("name")} />
          {showPassword && (
            <input type="password" {...form.register("password")} />
          )}
        </>
      );
    };
    const { rerender } = render(<Form showPassword />);
    expect(provider.getModelContext().system).toBe(
      'Form State:\n{"name":"Ada"}',
    );

    rerender(<Form showPassword={false} />);
    expect(form.getValues("password")).toBe("secret");
    expect(provider.getModelContext().system).toBe(
      'Form State:\n{"name":"Ada"}',
    );
  });

  it("omits configured sensitive fields without mounted inputs", () => {
    renderHook(() =>
      useAssistantForm({
        defaultValues: { name: "Ada", token: "secret" },
        assistant: { sensitiveFields: ["token"] },
      }),
    );

    expect(provider.getModelContext().system).toBe(
      'Form State:\n{"name":"Ada"}',
    );
  });

  it("omits sensitive fields named by compound autocomplete values", () => {
    const Form = () => {
      const form = useAssistantForm({
        defaultValues: {
          name: "Ada",
          login: "old-secret",
          card: "4242424242424242",
          passkey: "passkey-secret",
        },
      });
      return (
        <>
          <input
            autoComplete="section-checkout name"
            {...form.register("name")}
          />
          <input
            autoComplete="section-login current-password"
            {...form.register("login")}
          />
          <input autoComplete="billing cc-number" {...form.register("card")} />
          <input
            autoComplete="current-password webauthn"
            {...form.register("passkey")}
          />
        </>
      );
    };
    render(<Form />);

    expect(provider.getModelContext().system).toBe(
      'Form State:\n{"name":"Ada"}',
    );
  });

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

  describe.each(["input", "textarea", "select", "radio"])(
    "%s form ownership",
    (control) => {
      it.each([false, true])(
        "submits the explicit owner with an ancestor form: %s",
        async (nested) => {
          const submitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
            event.preventDefault(),
          );
          const wrongSubmitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
            event.preventDefault(),
          );
          const Fields = () => {
            const form = useAssistantForm<{ name: string }>();
            if (control === "textarea")
              return <textarea form="owner" {...form.register("name")} />;
            if (control === "select")
              return (
                <select form="owner" {...form.register("name")}>
                  <option value="a">A</option>
                </select>
              );
            if (control === "radio")
              return (
                <>
                  <input
                    type="radio"
                    value="a"
                    form="owner"
                    {...form.register("name")}
                  />
                  <input
                    type="radio"
                    value="b"
                    form="owner"
                    {...form.register("name")}
                  />
                </>
              );
            return <input form="owner" {...form.register("name")} />;
          };
          render(
            <>
              {nested ? (
                <form onSubmit={wrongSubmitted}>
                  <Fields />
                </form>
              ) : (
                <Fields />
              )}
              <form id="owner" onSubmit={submitted} />
            </>,
          );

          await expect(executeSubmitForm()).resolves.toEqual({ success: true });
          expect(submitted).toHaveBeenCalledOnce();
          expect(wrongSubmitted).not.toHaveBeenCalled();
        },
      );
    },
  );

  it("does not fall back to an ancestor when the explicit owner does not exist", async () => {
    const submitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );
    const Fields = () => {
      const form = useAssistantForm<{ name: string }>();
      return <input form="missing-owner" {...form.register("name")} />;
    };
    render(
      <form onSubmit={submitted}>
        <Fields />
      </form>,
    );

    await expect(executeSubmitForm()).resolves.toEqual({
      success: false,
      message: "Unable retrieve the form element. This is a coding error.",
    });
    expect(submitted).not.toHaveBeenCalled();
  });

  it("keeps the ancestor fallback for custom refs without a form owner property", async () => {
    await expectRegisteredFieldsToSubmit(() => {
      const form = useAssistantForm<{ name: string }>();
      return <div ref={form.register("name").ref} />;
    });
  });

  it("validates external controls before submitting their owner", async () => {
    const submitted = vi.fn((event: FormEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );
    const Fields = () => {
      const form = useAssistantForm<{ name: string }>();
      return <input required form="owner" {...form.register("name")} />;
    };
    render(
      <>
        <Fields />
        <form id="owner" onSubmit={submitted} />
      </>,
    );

    await expectSubmitBlocked();
    expect(submitted).not.toHaveBeenCalled();
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

  it("settles a pending assistant submission when the form unmounts", async () => {
    type FormValues = { name: string };
    let resolveValidation!: (result: ResolverResult<FormValues>) => void;
    const resolver: Resolver<FormValues> = vi.fn(
      () =>
        new Promise<ResolverResult<FormValues>>((resolve) => {
          resolveValidation = resolve;
        }),
    );
    const onValid = vi.fn();
    const Form = () => {
      const form = useAssistantForm<FormValues>({ resolver });
      return (
        <form onSubmit={form.handleSubmit(onValid)}>
          <input {...form.register("name")} />
        </form>
      );
    };
    const { unmount } = render(<Form />);

    const assistantSubmit = executeSubmitForm();
    await waitFor(() => expect(resolver).toHaveBeenCalledOnce());

    unmount();

    await expect(assistantSubmit).resolves.toEqual({
      success: false,
      message: "The form is no longer available.",
    });

    await act(async () => {
      resolveValidation({ values: { name: "Ada" }, errors: {} });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(onValid).not.toHaveBeenCalled();
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
