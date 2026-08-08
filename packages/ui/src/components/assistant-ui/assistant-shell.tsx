"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  ThreadList,
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
} from "@/components/assistant-ui/thread-list";
import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import { MenuIcon, MessagesSquareIcon, PanelLeftIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
  type ReactNode,
} from "react";

// The assistant-ui brand mark is the MessagesSquare glyph at stroke-width 3 (see docs favicon/icon.svg and brand/logotype.svg), so the default logo needs no bundled asset.
const defaultLogo = <MessagesSquareIcon strokeWidth={3} className="size-5" />;

// SSR apps can read this cookie and pass it back as defaultCollapsed for a zero-flash restore.
const COLLAPSED_COOKIE = "assistant-shell-collapsed";

// The fade is a mask rather than an overlay so it stays background-agnostic across the light bg-sidebar and dark bg-muted/30 shell backdrops.
// Each fade zone equals the scroll container's padding on that edge (pt-3 / pb-6), so at rest and at either scroll end only padding sits in the fade and no row is dimmed: overflow indication without any measurement.
// The scrollbar is hidden because classic or app-styled scrollbars reserve width from the right edge and knock the rows off-center; the edge fades signal overflow instead.
const SCROLL_AREA_CLASS =
  "relative flex-1 pt-3 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_0.75rem,black_calc(100%-1.5rem),transparent)]";

type AssistantShellContextValue = {
  collapsed: boolean;
  toggle: () => void;
  logo: ReactNode;
  title: ReactNode;
  sidebarFooter: ReactNode;
};

const AssistantShellContext = createContext<AssistantShellContextValue | null>(
  null,
);

export const useAssistantShell = (): AssistantShellContextValue => {
  const context = useContext(AssistantShellContext);
  if (!context)
    throw new Error("useAssistantShell must be used within AssistantShellRoot");
  return context;
};

export type AssistantShellProps = AssistantShellRootProps & {
  headerActions?: ReactNode;
};

export const AssistantShell: FC<AssistantShellProps> = ({
  headerActions,
  children,
  ...rootProps
}) => {
  return (
    <AssistantShellRoot {...rootProps}>
      <AssistantShellSidebar />
      <AssistantShellMain>
        <AssistantShellHeader>{headerActions}</AssistantShellHeader>
        <main data-slot="aui_shell-content" className="flex-1 overflow-hidden">
          {children}
        </main>
      </AssistantShellMain>
    </AssistantShellRoot>
  );
};

export type AssistantShellRootProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "title"
> & {
  logo?: ReactNode;
  title?: ReactNode;
  sidebarFooter?: ReactNode;
  defaultCollapsed?: boolean | undefined;
};

export const AssistantShellRoot: FC<AssistantShellRootProps> = ({
  logo = defaultLogo,
  title = "assistant-ui",
  sidebarFooter,
  defaultCollapsed,
  className,
  children,
  ...props
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

  useEffect(() => {
    document.cookie = `${COLLAPSED_COOKIE}=${collapsed}; path=/; max-age=31536000`;
  }, [collapsed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const context = useMemo(
    () => ({ collapsed, toggle, logo, title, sidebarFooter }),
    [collapsed, toggle, logo, title, sidebarFooter],
  );

  return (
    <AssistantShellContext.Provider value={context}>
      <div
        data-slot="aui_shell-root"
        className={cn(
          "bg-sidebar dark:bg-muted/30 flex h-dvh w-full",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </AssistantShellContext.Provider>
  );
};

export const AssistantShellSidebar: FC = () => {
  const { collapsed, logo, title, sidebarFooter } = useAssistantShell();

  return (
    <aside
      data-slot="aui_shell-sidebar"
      className={cn(
        "hidden flex-col overflow-hidden pb-2 transition-[width] duration-200 md:flex",
        collapsed ? "w-12" : "w-65",
      )}
    >
      <div
        data-slot="aui_shell-sidebar-header"
        className={cn(
          "mt-2 flex h-12 shrink-0 items-center transition-[padding] duration-200",
          collapsed ? "px-3.5" : "px-6",
        )}
      >
        <div data-slot="aui_shell-logo" className="flex shrink-0 items-center">
          {logo}
        </div>
        {title != null && (
          <span
            data-slot="aui_shell-sidebar-title"
            className={cn(
              "text-foreground/90 ml-2 text-sm font-medium whitespace-nowrap transition-opacity duration-200",
              collapsed && "opacity-0",
            )}
          >
            {title}
          </span>
        )}
      </div>
      <ThreadListRoot className="min-h-0 flex-1 overflow-hidden">
        <div
          data-slot="aui_shell-sidebar-new"
          className={cn(
            "shrink-0 transition-[padding] duration-200",
            collapsed ? "px-2 pt-1 pb-2" : "px-3 pt-2 pb-1.5",
          )}
        >
          <TooltipProvider>
            {/* Disabled while expanded rather than unmounting the content: hover would still open the root invisibly, and Base UI's safe-polygon close needs a mounted popup, so the tooltip would reappear stuck open on the next collapse. */}
            <Tooltip disabled={!collapsed}>
              {/* Base UI merges trigger props over the render element's, so the trigger must re-declare the button's data-slot or it is replaced by "tooltip-trigger". */}
              <TooltipTrigger
                data-slot="aui_thread-list-new"
                render={
                  <ThreadListNew
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      // Button has a 1px transparent border, so 7px padding centers the 16px icon in the 32px rail.
                      collapsed
                        ? "w-8 gap-0 px-[7px] has-[>svg]:px-[7px]"
                        : "w-full gap-2 px-2.5 has-[>svg]:px-2.5",
                    )}
                    labelClassName={cn(
                      "overflow-hidden transition-all duration-200",
                      collapsed ? "max-w-0 opacity-0" : "max-w-24 opacity-100",
                    )}
                  />
                }
              />
              <TooltipContent side="right">New Thread</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div
          data-slot="aui_shell-sidebar-scroll"
          className={cn(
            // overflow-x-hidden: group labels are wider than the collapsed rail and would otherwise raise a horizontal overlay scrollbar above the footer.
            "overflow-x-hidden transition-[padding] duration-200",
            collapsed ? "overflow-y-hidden px-2" : "overflow-y-auto px-3",
            SCROLL_AREA_CLASS,
          )}
        >
          <ThreadListItems
            aria-hidden={collapsed}
            inert={collapsed}
            className={cn(
              "transition-[opacity,transform] duration-150",
              collapsed
                ? "pointer-events-none opacity-0 delay-50"
                : "translate-x-0 opacity-100",
            )}
          />
        </div>
      </ThreadListRoot>
      {sidebarFooter != null && (
        <div
          data-slot="aui_shell-sidebar-footer"
          className={cn(
            // px-1.5 centers the w-9 footer trigger in the w-12 rail.
            "shrink-0 pt-1 transition-[padding] duration-200",
            collapsed ? "px-1.5" : "px-3",
          )}
        >
          {sidebarFooter}
        </div>
      )}
    </aside>
  );
};

export const AssistantShellMain: FC<ComponentPropsWithoutRef<"div">> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      data-slot="aui_shell-main-wrapper"
      className={cn(
        "flex flex-1 flex-col overflow-hidden p-2 md:pl-0",
        className,
      )}
      {...props}
    >
      <div
        data-slot="aui_shell-main"
        className="bg-background flex flex-1 flex-col overflow-hidden rounded-lg"
      >
        {children}
      </div>
    </div>
  );
};

export const AssistantShellSidebarToggle: FC = () => {
  const { collapsed, toggle } = useAssistantShell();

  return (
    <TooltipIconButton
      tooltip={collapsed ? "Show sidebar" : "Hide sidebar"}
      side="bottom"
      onClick={toggle}
      data-slot="aui_shell-sidebar-toggle"
      className="hidden size-8 md:flex"
    >
      <PanelLeftIcon className="size-4" />
    </TooltipIconButton>
  );
};

export const AssistantShellHeader: FC<ComponentPropsWithoutRef<"header">> = ({
  className,
  children,
  ...props
}) => {
  return (
    <header
      data-slot="aui_shell-header"
      className={cn("flex h-12 shrink-0 items-center gap-2 px-4", className)}
      {...props}
    >
      <AssistantShellMobileSidebar />
      <AssistantShellSidebarToggle />
      <AssistantShellThreadTitle />
      {children != null && (
        <div
          data-slot="aui_shell-header-actions"
          className="ml-auto flex items-center gap-1"
        >
          {children}
        </div>
      )}
    </header>
  );
};

export const AssistantShellMobileSidebar: FC = () => {
  const context = useAssistantShell();
  const { logo, title, sidebarFooter } = context;

  // The mobile drawer is always full width, so footer items inside it must not inherit the desktop collapsed state.
  const expandedContext = useMemo(
    () => ({ ...context, collapsed: false }),
    [context],
  );

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            data-slot="aui_shell-mobile-trigger"
            className="size-8 shrink-0 md:hidden"
          />
        }
      >
        <MenuIcon className="size-4" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-70 flex-col p-0">
        <SheetTitle className="sr-only">Sidebar</SheetTitle>
        <div
          data-slot="aui_shell-mobile-header"
          className="flex h-12 shrink-0 items-center px-4"
        >
          <div className="flex items-center gap-2 px-2 text-sm font-medium">
            {logo}
            {title != null && (
              <span className="text-foreground/90">{title}</span>
            )}
          </div>
        </div>
        <div
          data-slot="aui_shell-mobile-content"
          className={cn("overflow-y-auto px-3", SCROLL_AREA_CLASS)}
        >
          <ThreadList />
        </div>
        {sidebarFooter != null && (
          <AssistantShellContext.Provider value={expandedContext}>
            <div
              data-slot="aui_shell-mobile-footer"
              className="shrink-0 p-3 pt-1"
            >
              {sidebarFooter}
            </div>
          </AssistantShellContext.Provider>
        )}
      </SheetContent>
    </Sheet>
  );
};

export const AssistantShellThreadTitle: FC = () => {
  const title = useAuiState(
    (s) =>
      s.threads.threadItems.find((t) => t.id === s.threads.mainThreadId)?.title,
  );

  return (
    <span
      data-slot="aui_shell-thread-title"
      className="min-w-0 truncate text-sm font-medium"
    >
      {title ?? "New Chat"}
    </span>
  );
};

export type AssistantShellFooterItemProps = ComponentPropsWithoutRef<
  typeof Button
> & {
  icon: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
};

export const AssistantShellFooterItem: FC<AssistantShellFooterItemProps> = ({
  icon,
  label,
  description,
  trailing,
  className,
  id,
  ...props
}) => {
  const { collapsed } = useAssistantShell();

  return (
    <TooltipProvider>
      {/* Disabled while expanded rather than unmounting the content: hover would still open the root invisibly, and Base UI's safe-polygon close needs a mounted popup, so the tooltip would reappear stuck open on the next collapse. */}
      <Tooltip disabled={!collapsed}>
        {/* Base UI merges trigger props over the render element's, so the trigger must re-declare the button's data-slot or it is replaced by "tooltip-trigger". */}
        {/* When composed inside a menu trigger (e.g. DropdownMenuTrigger render={<AssistantShellFooterItem/>}), the menu's id wins the merge onto the shared button. Base UI resolves a popup's active trigger from the DOM id, so the tooltip must register under that same id or it closes itself the moment hover opens it. */}
        <TooltipTrigger
          id={id}
          data-slot="aui_shell-footer-item"
          render={
            <Button
              variant="ghost"
              {...props}
              className={cn(
                "justify-start gap-2 overflow-hidden border-none transition-all duration-200",
                collapsed ? "size-9 px-1" : "h-11 w-full px-1.5",
                className,
              )}
            >
              {/* Consumer avatars carry a fixed size-8, so they track the icon well (size-full) and shrink with its width/height transition when collapsing. */}
              <span
                data-slot="aui_shell-footer-item-icon"
                className={cn(
                  "flex shrink-0 items-center justify-center transition-[width,height] duration-200 **:data-[slot=avatar]:size-full",
                  collapsed ? "size-7" : "size-8",
                )}
              >
                {icon}
              </span>
              <span
                data-slot="aui_shell-footer-item-text"
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-start overflow-hidden text-left transition-opacity duration-200",
                  collapsed ? "opacity-0" : "opacity-100",
                )}
              >
                <span className="w-full truncate text-sm font-medium">
                  {label}
                </span>
                {description != null && (
                  <span className="text-muted-foreground w-full truncate text-xs font-normal">
                    {description}
                  </span>
                )}
              </span>
              {trailing != null && (
                <span
                  data-slot="aui_shell-footer-item-trailing"
                  className={cn(
                    "text-muted-foreground shrink-0 transition-opacity duration-200",
                    collapsed && "opacity-0",
                  )}
                >
                  {trailing}
                </span>
              )}
            </Button>
          }
        />
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
