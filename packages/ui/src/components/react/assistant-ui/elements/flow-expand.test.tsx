import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { FlowExpand } from "./flow-expand";

afterEach(cleanup);

it("returns focus to the expand button after closing the viewer", async () => {
  render(
    <FlowExpand>
      <span>diagram</span>
    </FlowExpand>,
  );
  const trigger = screen.getByRole("button", { name: "Expand diagram" });
  trigger.focus();
  fireEvent.click(trigger);
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Close diagram" }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
