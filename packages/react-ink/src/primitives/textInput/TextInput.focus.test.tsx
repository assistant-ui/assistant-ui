import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ComposerTextInput, TextInput } from "./TextInput";

const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(cleanup);

describe("composer input focus", () => {
  it.each([false, true])(
    "accepts input after enabling an initially disabled=%s composer",
    async (initiallyDisabled) => {
      const onChange = vi.fn();
      const onSubmit = vi.fn();
      const input = (isDisabled: boolean) => (
        <ComposerTextInput
          value="hello"
          onChange={onChange}
          onSubmit={onSubmit}
          submitOnEnter
          isDisabled={isDisabled}
        />
      );
      const instance = render(input(initiallyDisabled));
      await settle();
      const rawMode = vi.spyOn(instance.stdin, "setRawMode");

      instance.rerender(input(true));
      await settle();
      instance.stdin.write("!");
      instance.stdin.write("\r");
      await settle();

      expect(onChange).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      instance.rerender(input(false));
      await settle();
      instance.stdin.write("!");
      await settle();
      instance.stdin.write("\r");
      await settle();

      expect(onChange).toHaveBeenCalledWith("hello!");
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(rawMode).not.toHaveBeenCalledWith(false);
    },
  );

  it("keeps focus on another input when the composer is enabled", async () => {
    const onComposerChange = vi.fn();
    const onOtherChange = vi.fn();
    const inputs = (isDisabled: boolean) => (
      <>
        <ComposerTextInput
          value="composer"
          onChange={onComposerChange}
          isDisabled={isDisabled}
        />
        <TextInput value="other" onChange={onOtherChange} autoFocus={false} />
      </>
    );
    const instance = render(inputs(false));
    await settle();
    instance.stdin.write("\t");
    await settle();
    instance.rerender(inputs(true));
    await settle();
    instance.rerender(inputs(false));
    await settle();
    instance.stdin.write("!");
    await settle();

    expect(onOtherChange).toHaveBeenCalledWith("other!");
    expect(onComposerChange).not.toHaveBeenCalled();
  });
});
