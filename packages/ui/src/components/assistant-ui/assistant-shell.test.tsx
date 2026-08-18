import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
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
  AssistantShellMobileSidebar,
  useAssistantShell,
} from "./assistant-shell";

vi.mock("./thread-list", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./thread-list")>()),
  ThreadList: () => (
    <button data-slot="aui_thread-list-item-trigger" type="button">
      Thread A
    </button>
  ),
}));

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

const CollapsedProbe = () => {
  const { collapsed } = useAssistantShell();
  return <span data-testid="collapsed">{String(collapsed)}</span>;
};

describe("AssistantShellRoot collapse persistence", () => {
  beforeEach(() => {
    document.cookie = "assistant-shell-collapsed=; path=/; max-age=0";
  });

  it("restores the collapsed state from the cookie when no defaultCollapsed is given", () => {
    document.cookie = "assistant-shell-collapsed=true; path=/";

    render(
      <AssistantShellRoot>
        <CollapsedProbe />
      </AssistantShellRoot>,
    );

    expect(screen.getByTestId("collapsed").textContent).toBe("true");
    expect(document.cookie).toContain("assistant-shell-collapsed=true");
  });

  it("lets defaultCollapsed win over the cookie as the server handoff", () => {
    document.cookie = "assistant-shell-collapsed=true; path=/";

    render(
      <AssistantShellRoot defaultCollapsed={false}>
        <CollapsedProbe />
      </AssistantShellRoot>,
    );

    expect(screen.getByTestId("collapsed").textContent).toBe("false");
    expect(document.cookie).toContain("assistant-shell-collapsed=false");
  });

  it("writes the cookie when toggled", () => {
    const Toggle = () => {
      const { toggle } = useAssistantShell();
      return (
        <button type="button" onClick={toggle}>
          toggle
        </button>
      );
    };

    render(
      <AssistantShellRoot>
        <Toggle />
      </AssistantShellRoot>,
    );

    fireEvent.click(screen.getByText("toggle"));
    expect(document.cookie).toContain("assistant-shell-collapsed=true");
  });
});

describe("AssistantShellMobileSidebar navigation", () => {
  const renderDrawer = async () => {
    render(
      <AssistantShellRoot>
        <AssistantShellMobileSidebar />
      </AssistantShellRoot>,
    );
    await act(async () => {
      fireEvent.click(
        document.querySelector('[data-slot="aui_shell-mobile-trigger"]')!,
      );
    });
    expect(screen.getByText("Thread A")).toBeTruthy();
  };

  it("closes the drawer when a thread is selected", async () => {
    await renderDrawer();

    await act(async () => {
      fireEvent.click(screen.getByText("Thread A"));
    });
    expect(screen.queryByText("Thread A")).toBeNull();
  });

  it("stays open for clicks that are not thread navigation", async () => {
    await renderDrawer();

    await act(async () => {
      fireEvent.click(
        document.querySelector('[data-slot="aui_shell-mobile-content"]')!,
      );
    });
    expect(screen.getByText("Thread A")).toBeTruthy();
  });
});
