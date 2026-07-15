import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { createActionRegistry } from "../actionRegistry";
import { layoutVocabulary } from "./layout";
import type { FormControlElementLike } from "./collectFormValues";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, layoutVocabulary)}</>);

const el = (
  partial: Partial<FormControlElementLike>,
): FormControlElementLike => ({
  name: "",
  type: "text",
  value: "",
  disabled: false,
  ...partial,
});

const getFooterButtons = (out: ReactElement) => {
  const footer = (out.props as { children: unknown[] })
    .children[2] as ReactElement;
  const [confirmBtn, cancelBtn] = (
    footer.props as { children: [ReactElement | null, ReactElement | null] }
  ).children;
  return { confirmBtn, cancelBtn };
};

describe("layoutVocabulary", () => {
  it("Card renders a section with optional title and padding/background hooks", () => {
    expect(
      render({
        $type: "Card",
        title: "T",
        padding: 2,
        background: "muted",
      }),
    ).toBe(
      '<section data-aui="card" data-aui-padding="2" data-aui-background="muted"><header data-aui="card-title">T</header></section>',
    );
  });

  it("Card without a title omits the header", () => {
    expect(render({ $type: "Card" })).toBe(
      '<section data-aui="card"></section>',
    );
  });

  it("Col renders a div with gap/align hooks and nested children", () => {
    expect(
      render({
        $type: "Col",
        gap: 2,
        align: "center",
        children: { $type: "Text", value: "x" } as never,
      }),
    ).toContain('data-aui="col"');
  });

  it("Row renders a div with gap/align/justify hooks", () => {
    const html = render({
      $type: "Row",
      gap: 4,
      align: "start",
      justify: "between",
    });
    expect(html).toBe(
      '<div data-aui="row" data-aui-gap="4" data-aui-align="start" data-aui-justify="between"></div>',
    );
  });

  it("Spacer renders an empty div", () => {
    expect(render({ $type: "Spacer" })).toBe('<div data-aui="spacer"></div>');
  });

  it("Badge renders a span with the value and variant hook", () => {
    expect(render({ $type: "Badge", value: "new", variant: "success" })).toBe(
      '<span data-aui="badge" data-aui-variant="success">new</span>',
    );
  });
});

describe("layoutVocabulary Card asForm/confirm/cancel", () => {
  it("Card with asForm renders a form element with the data-aui-asform hook", () => {
    const html = render({ $type: "Card", asForm: true, title: "T" });
    expect(html).toContain("<form ");
    expect(html).toContain('data-aui-asform="true"');
    expect(html).not.toContain("<section");
  });

  it("Card without asForm renders a section with no data-aui-asform hook", () => {
    const html = render({ $type: "Card" });
    expect(html).toContain("<section");
    expect(html).not.toContain("data-aui-asform");
  });

  it("Card omits the footer when neither confirm nor cancel is present", () => {
    expect(render({ $type: "Card" })).not.toContain("card-footer");
  });

  it("Card renders a footer when only confirm is present", () => {
    expect(render({ $type: "Card", confirm: { label: "OK" } })).toContain(
      'data-aui="card-footer"',
    );
  });

  it("Card renders a footer when only cancel is present", () => {
    expect(render({ $type: "Card", cancel: { label: "Cancel" } })).toContain(
      'data-aui="card-footer"',
    );
  });

  it("Card confirm renders a submit button when asForm is set", () => {
    const html = render({
      $type: "Card",
      asForm: true,
      confirm: { label: "Save" },
    });
    expect(html).toContain('type="submit" data-aui="card-confirm"');
    expect(html).toContain("Save");
  });

  it("Card confirm renders a click button when asForm is not set", () => {
    const html = render({ $type: "Card", confirm: { label: "Save" } });
    expect(html).toContain('type="button" data-aui="card-confirm"');
  });

  it("Card cancel always renders a plain button regardless of asForm", () => {
    const html = render({
      $type: "Card",
      asForm: true,
      cancel: { label: "Dismiss" },
    });
    expect(html).toContain('type="button" data-aui="card-cancel"');
  });
});

describe("layoutVocabulary Card asForm/confirm/cancel dispatch", () => {
  it("Card asForm submit collects named values and dispatches confirm.$action with $input", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ save: handler });
    const out = layoutVocabulary.Card.render({
      asForm: true,
      confirm: { label: "Save", $action: { type: "save" } },
      $status: "done",
      $dispatch: registry.dispatch,
    }) as ReactElement;
    const onSubmit = (out.props as { onSubmit: (e: unknown) => void }).onSubmit;
    const event = {
      preventDefault: vi.fn(),
      currentTarget: {
        elements: [el({ name: "email", type: "email", value: "a@x.com" })],
      },
    };
    onSubmit(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({
      payload: { type: "save", $input: { email: "a@x.com" } },
    });
  });

  it("Card confirm click (non-asForm) fires confirm.$action without $input", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ save: handler });
    const out = layoutVocabulary.Card.render({
      confirm: { label: "Save", $action: { type: "save" } },
      $status: "done",
      $dispatch: registry.dispatch,
    }) as ReactElement;
    const { confirmBtn } = getFooterButtons(out);
    const onClick = (confirmBtn!.props as { onClick: () => void }).onClick;
    onClick();
    expect(handler).toHaveBeenCalledWith({ payload: { type: "save" } });
  });

  it("Card confirm button has no onClick when asForm is set (the form submit handles it)", () => {
    const out = layoutVocabulary.Card.render({
      asForm: true,
      confirm: { label: "Save", $action: { type: "save" } },
      $status: "done",
    }) as ReactElement;
    const { confirmBtn } = getFooterButtons(out);
    expect(
      (confirmBtn!.props as { onClick?: unknown }).onClick,
    ).toBeUndefined();
  });

  it("Card cancel click fires cancel.$action without $input regardless of asForm", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ dismiss: handler });
    const out = layoutVocabulary.Card.render({
      asForm: true,
      cancel: { label: "Dismiss", $action: { type: "dismiss" } },
      $status: "done",
      $dispatch: registry.dispatch,
    }) as ReactElement;
    const { cancelBtn } = getFooterButtons(out);
    const onClick = (cancelBtn!.props as { onClick: () => void }).onClick;
    onClick();
    expect(handler).toHaveBeenCalledWith({ payload: { type: "dismiss" } });
  });
});
