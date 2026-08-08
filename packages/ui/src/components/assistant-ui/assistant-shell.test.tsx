import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AssistantShellRoot,
  AssistantShellFooterItem,
} from "./assistant-shell";

const tooltip = () =>
  document.querySelector<HTMLElement>('[data-slot="tooltip-content"]');

const renderFooterItem = ({ collapsed }: { collapsed: boolean }) => {
  render(
    <AssistantShellRoot defaultCollapsed={collapsed}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <AssistantShellFooterItem
              icon={
                <Avatar>
                  <AvatarFallback data-testid="avatar" />
                </Avatar>
              }
              label="Alex Johnson"
              description="Personal account"
            />
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </AssistantShellRoot>,
  );
  return document.querySelector<HTMLElement>(
    '[data-slot="dropdown-menu-trigger"]',
  )!;
};

const hover = async (target: HTMLElement) => {
  await act(async () => {
    fireEvent.pointerEnter(target, { pointerType: "mouse" });
    fireEvent.mouseEnter(target);
    fireEvent.mouseOver(target);
  });
};

// The footer item is designed to be composed as a menu trigger's render element, which
// merges both triggers onto one button. Base UI resolves a popup's active trigger from
// the DOM id, so the tooltip must register under the menu's id (the one that wins the
// merge) or it closes itself the moment hover opens it.
describe("AssistantShellFooterItem tooltip inside a menu trigger", () => {
  it("opens on hover when collapsed and survives pointer movement inside the button", async () => {
    const button = renderFooterItem({ collapsed: true });

    await hover(button);
    expect(tooltip()?.textContent).toContain("Alex Johnson");

    await hover(screen.getByTestId("avatar"));
    await act(async () => {
      fireEvent.mouseMove(button, { clientX: 20, clientY: 20 });
    });
    expect(tooltip()?.textContent).toContain("Alex Johnson");
  });

  it("does not open when expanded", async () => {
    const button = renderFooterItem({ collapsed: false });

    await hover(button);
    expect(tooltip()).toBeNull();
  });
});
