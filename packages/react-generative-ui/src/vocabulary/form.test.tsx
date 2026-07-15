import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { createActionRegistry } from "../actionRegistry";
import { formVocabulary } from "./form";
import type { FormControlElementLike } from "./collectFormValues";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, formVocabulary)}</>);

const el = (
  partial: Partial<FormControlElementLike>,
): FormControlElementLike => ({
  name: "",
  type: "text",
  value: "",
  disabled: false,
  ...partial,
});

const fakeSubmitEvent = (elements: FormControlElementLike[]) => ({
  preventDefault: vi.fn(),
  currentTarget: { elements },
});

describe("formVocabulary", () => {
  it("Form renders a form element with children and a gap hook", () => {
    const html = render({
      $type: "Form",
      gap: 2,
      children: { $type: "Fact", label: "a", value: "b" } as never,
    });
    expect(html).toContain('<form data-aui="form" data-aui-gap="2">');
  });

  it("Form without gap or $action renders bare", () => {
    expect(render({ $type: "Form" })).toBe('<form data-aui="form"></form>');
  });

  it("Form onSubmit prevents default and dispatches collected values keyed by name", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ save: handler });
    const out = formVocabulary.Form.render({
      $status: "done",
      $action: { type: "save" },
      $dispatch: registry.dispatch,
    }) as ReactElement;
    const onSubmit = (out.props as { onSubmit: (e: unknown) => void }).onSubmit;
    const event = fakeSubmitEvent([
      el({ name: "email", type: "email", value: "a@example.com" }),
      el({ name: "agree", type: "checkbox", checked: true }),
      el({ name: "size", type: "radio", value: "sm", checked: false }),
      el({ name: "size", type: "radio", value: "lg", checked: true }),
      el({ name: "", type: "text", value: "ignored" }),
      el({ name: "off", type: "text", value: "ignored", disabled: true }),
    ]);
    onSubmit(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({
      payload: {
        type: "save",
        $input: { email: "a@example.com", agree: true, size: "lg" },
      },
    });
  });

  it("Form onSubmit collects repeated non-radio names into an array", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ save: handler });
    const out = formVocabulary.Form.render({
      $status: "done",
      $action: { type: "save" },
      $dispatch: registry.dispatch,
    }) as ReactElement;
    const onSubmit = (out.props as { onSubmit: (e: unknown) => void }).onSubmit;
    onSubmit(
      fakeSubmitEvent([
        el({ name: "tag", type: "text", value: "a" }),
        el({ name: "tag", type: "text", value: "b" }),
      ]),
    );
    expect(handler).toHaveBeenCalledWith({
      payload: { type: "save", $input: { tag: ["a", "b"] } },
    });
  });

  it("Form onSubmit is silent (but still prevents default) when no $action is wired", () => {
    const out = formVocabulary.Form.render({
      $status: "done",
    }) as ReactElement;
    const onSubmit = (out.props as { onSubmit: (e: unknown) => void }).onSubmit;
    const event = fakeSubmitEvent([
      el({ name: "x", type: "text", value: "y" }),
    ]);
    expect(() => onSubmit(event)).not.toThrow();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("Form onSubmit is silent (but still prevents default) when $action is present but no $dispatch is wired", () => {
    const out = formVocabulary.Form.render({
      $status: "done",
      $action: { type: "save" },
    }) as ReactElement;
    const onSubmit = (out.props as { onSubmit: (e: unknown) => void }).onSubmit;
    const event = fakeSubmitEvent([
      el({ name: "x", type: "text", value: "y" }),
    ]);
    expect(() => onSubmit(event)).not.toThrow();
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
