import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as ActionBarMorePrimitive from "./actionBarMore";
import * as ThreadListItemMorePrimitive from "./threadListItemMore";

describe("dropdown menu primitive render props", () => {
  it.each([
    [
      "ActionBarMorePrimitive.Trigger",
      ActionBarMorePrimitive.Root,
      ActionBarMorePrimitive.Trigger,
    ],
    [
      "ThreadListItemMorePrimitive.Trigger",
      ThreadListItemMorePrimitive.Root,
      ThreadListItemMorePrimitive.Trigger,
    ],
  ])("%s render matches asChild", (_name, Root, Trigger) => {
    const renderHtml = renderToStaticMarkup(
      <Root open>
        <Trigger render={<button type="button" className="trigger" />}>
          More
        </Trigger>
      </Root>,
    );

    const asChildHtml = renderToStaticMarkup(
      <Root open>
        <Trigger asChild>
          <button type="button" className="trigger">
            More
          </button>
        </Trigger>
      </Root>,
    );

    expect(renderHtml).toBe(asChildHtml);
  });

  it("accepts render on all affected dropdown menu primitives", () => {
    const actionBarTree = (
      <ActionBarMorePrimitive.Root open>
        <ActionBarMorePrimitive.Trigger render={<button type="button" />} />
        <ActionBarMorePrimitive.Content render={<div />} />
        <ActionBarMorePrimitive.Item render={<div />} />
        <ActionBarMorePrimitive.Separator render={<div />} />
      </ActionBarMorePrimitive.Root>
    );

    const threadListItemTree = (
      <ThreadListItemMorePrimitive.Root open>
        <ThreadListItemMorePrimitive.Trigger
          render={<button type="button" />}
        />
        <ThreadListItemMorePrimitive.Content render={<div />} />
        <ThreadListItemMorePrimitive.Item render={<div />} />
        <ThreadListItemMorePrimitive.Separator render={<div />} />
      </ThreadListItemMorePrimitive.Root>
    );

    expect(actionBarTree).toBeTruthy();
    expect(threadListItemTree).toBeTruthy();
  });
});
