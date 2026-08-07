"use client";

import { Button } from "@/components/ui/radix/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/radix/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/radix/tooltip";
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
// Each fade zone equals the scroll container's padding on that edge (pt-3 / pb-6), so at rest and at either scroll end only padding sits in the fade and no row is dimmed — overflow indication without any measurement.
const SCROLL_FADE_CLASS =
  "[mask-image:linear-gradient(to_bottom,transparent,black_0.75rem,black_calc(100%-1.5rem),transparent)]";

type AssistantShellContextValue = {
  collapsed: boolean;
  toggle: () => void;
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

export type AssistantShellProps = {
  logo?: ReactNode;
  title?: ReactNode;
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
  defaultCollapsed?: boolean;
  children: ReactNode;
};

export const AssistantShell: FC<AssistantShellProps> = ({
  logo,
  title,
  headerActions,
  sidebarFooter,
  defaultCollapsed,
  children,
}) => {
  return (
    <AssistantShellRoot defaultCollapsed={defaultCollapsed}>
      <AssistantShellSidebar logo={logo} title={title} footer={sidebarFooter} />
      <AssistantShellMain>
        <AssistantShellHeader
          logo={logo}
          title={title}
          sidebarFooter={sidebarFooter}
        >
          {headerActions}
        </AssistantShellHeader>
        <main data-slot="aui_shell-content" className="flex-1 overflow-hidden">
          {children}
        </main>
      </AssistantShellMain>
    </AssistantShellRoot>
  );
};

export type AssistantShellRootProps = ComponentPropsWithoutRef<"div"> & {
  defaultCollapsed?: boolean | undefined;
};

export const AssistantShellRoot: FC<AssistantShellRootProps> = ({
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

  const context = useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);

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

export type AssistantShellSidebarProps = {
  logo?: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
};

export const AssistantShellSidebar: FC<AssistantShellSidebarProps> = ({
  logo = defaultLogo,
  title = "assistant-ui",
  footer,
}) => {
  const { collapsed } = useAssistantShell();

  return (
    <div data-slot="aui_shell-sidebar-wrapper" className="hidden md:block">
      <aside
        data-slot="aui_shell-sidebar"
        className={cn(
          "flex h-full flex-col overflow-hidden pb-2 transition-all duration-200",
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
          <div
            data-slot="aui_shell-logo"
            className="flex shrink-0 items-center"
          >
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
              <Tooltip>
                {/* DOM no-op (Radix Slot lets the child's identical data-slot win); present for registry slot parity with the base flavor. */}
                <TooltipTrigger asChild data-slot="aui_thread-list-new">
                  <ThreadListNew
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      collapsed
                        ? "w-8 gap-0 px-2 has-[>svg]:px-2"
                        : "w-full gap-2 px-2.5 has-[>svg]:px-2.5",
                    )}
                    labelClassName={cn(
                      "overflow-hidden transition-all duration-200",
                      collapsed ? "max-w-0 opacity-0" : "max-w-24 opacity-100",
                    )}
                  />
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">New Thread</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          <div
            data-slot="aui_shell-sidebar-scroll"
            className={cn(
              // overflow-x-hidden: group labels are wider than the collapsed rail and would otherwise raise a horizontal overlay scrollbar above the footer.
              // The scrollbar is hidden because classic or app-styled scrollbars reserve width from the right edge and knock the rows off-center; the edge fades signal overflow instead.
              "relative flex-1 overflow-x-hidden pt-3 pb-6 transition-[padding] duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              collapsed ? "overflow-y-hidden px-2" : "overflow-y-auto px-3",
              SCROLL_FADE_CLASS,
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
        {footer != null && (
          <div
            data-slot="aui_shell-sidebar-footer"
            className={cn(
              "shrink-0 pt-1 transition-[padding] duration-200",
              collapsed ? "px-1" : "px-3",
            )}
          >
            {footer}
          </div>
        )}
      </aside>
    </div>
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

export type AssistantShellHeaderProps = Omit<
  ComponentPropsWithoutRef<"header">,
  "title"
> & {
  logo?: ReactNode;
  title?: ReactNode;
  sidebarFooter?: ReactNode;
};

export const AssistantShellHeader: FC<AssistantShellHeaderProps> = ({
  logo = defaultLogo,
  title = "assistant-ui",
  sidebarFooter,
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
      <AssistantShellMobileSidebar
        logo={logo}
        title={title}
        footer={sidebarFooter}
      />
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

export type AssistantShellMobileSidebarProps = {
  logo?: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
};

export const AssistantShellMobileSidebar: FC<
  AssistantShellMobileSidebarProps
> = ({ logo = defaultLogo, title = "assistant-ui", footer }) => {
  const context = useAssistantShell();

  // The mobile drawer is always full width, so footer items inside it must not inherit the desktop collapsed state.
  const expandedContext = useMemo(
    () => ({ ...context, collapsed: false }),
    [context],
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-slot="aui_shell-mobile-trigger"
          className="size-8 shrink-0 md:hidden"
        >
          <MenuIcon className="size-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
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
          className={cn(
            "relative flex-1 overflow-y-auto px-3 pt-3 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            SCROLL_FADE_CLASS,
          )}
        >
          <ThreadList />
        </div>
        {footer != null && (
          <AssistantShellContext.Provider value={expandedContext}>
            <div
              data-slot="aui_shell-mobile-footer"
              className="shrink-0 p-3 pt-1"
            >
              {footer}
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
  ...props
}) => {
  const { collapsed } = useAssistantShell();

  return (
    <TooltipProvider>
      <Tooltip>
        {/* Radix Slot lets the child's data-slot win, so it lives on the Button rather than the trigger. */}
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            data-slot="aui_shell-footer-item"
            {...props}
            className={cn(
              // border-none frees the full 32px rail width for the icon, which the Button's 1px transparent border would otherwise clip.
              "overflow-hidden border-none transition-all duration-200",
              // The zero-width label stack keeps its natural height, so the collapsed button must pin an explicit size; size-10 leaves 4px of hover surface around the centered size-8 avatar.
              collapsed
                ? "size-10 gap-0 p-0"
                : "h-auto w-full justify-start gap-2 p-2",
              className,
            )}
          >
            <span
              data-slot="aui_shell-footer-item-icon"
              className="flex size-8 shrink-0 items-center justify-center"
            >
              {icon}
            </span>
            <span
              data-slot="aui_shell-footer-item-text"
              className={cn(
                "flex min-w-0 flex-col items-start overflow-hidden text-left transition-all duration-200",
                collapsed ? "max-w-0 opacity-0" : "flex-1 opacity-100",
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
                  collapsed && "w-0 opacity-0",
                )}
              >
                {trailing}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
};
