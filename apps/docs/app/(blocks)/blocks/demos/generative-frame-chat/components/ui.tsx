"use client";

import {
  AuiIf,
  ComposerPrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowShrink01Icon,
  ArrowUp02Icon,
  BubbleChatAddIcon,
  BubbleChatIcon,
  Cancel01Icon,
  ChartLineData01Icon,
  Copy01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  GridViewIcon,
  HelpCircleIcon,
  Invoice01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  Search01Icon,
  SidebarLeftIcon,
  SourceCodeIcon,
  SparklesIcon,
  StopIcon,
  Tick02Icon,
  Timer01Icon,
  TransactionHistoryIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartLineIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  CodeIcon,
  CopyIcon,
  EllipsisIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  Maximize2Icon,
  MessageCircleIcon,
  Minimize2Icon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon as LucideSparklesIcon,
  SquareIcon,
  SquarePenIcon,
  TimerIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Class strings every layout shares.                                         */
/* -------------------------------------------------------------------------- */

/** Corners, stepped around `--radius` (16px) so a nested corner fits. */
export const radius = {
  sm: "rounded-[calc(var(--radius)-4px)]",
  md: "rounded-[calc(var(--radius)-2px)]",
  lg: "rounded-(--radius)",
  xl: "rounded-[calc(var(--radius)+4px)]",
  composer: "rounded-[calc(var(--radius)+8px)]",
} as const;

/** The type styles of the interface. Message text is set by `.gfc-prose`. */
export const text = {
  body: "text-sm leading-5",
  bodySm: "text-[0.8125rem] leading-[1.125rem]",
  small: "text-xs leading-4",
  title: "text-2xl leading-8 tracking-[-0.02em]",
} as const;

export const weight = {
  regular: "font-(--weight-regular)",
  label: "font-(--weight-label)",
  strong: "font-(--weight-strong)",
  heading: "font-(--weight-heading)",
} as const;

/** A 1px line in the quiet border color: `border`, `border-t`, `border-e`. */
export const hairline = "border-border/60";

/** Translucent and blurred, for anything that floats over the page. */
export const glass =
  "border border-border/60 bg-(--glass) backdrop-blur-(--glass-blur) [--accent:var(--glass-hover)] [--muted-foreground:var(--glass-muted-foreground)] not-supports-[backdrop-filter:blur(1px)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

/** Glass with the one shadow: menus, popovers, a floating bar or drawer. */
export const floating = `${glass} shadow-(--float-shadow)`;

/** Denser glass, for a surface whose own text has to read over the page's. */
export const denseGlass =
  "[--glass-blur:20px] [--glass:color-mix(in_oklab,var(--popover)_86%,transparent)]";

/**
 * A quiet raised surface on the page: a card, a chip. Its fill is one utility
 * with no `dark:` variant, because a `dark:` fill is a later rule of the same
 * weight as `hover:bg-accent` and `aria-pressed:bg-accent` and would hide both.
 */
export const paper = "border border-border/60 bg-card";

/** A filled area with no border: a user message, a well. */
export const field = "bg-foreground/4 dark:bg-foreground/6";

/** No ring on focus; a keyboard focus turns the border to `--ring`. */
export const focusBorder =
  "border border-transparent outline-none focus-visible:border-ring";

/**
 * The composer: on the background, a light border, 24px corners and one soft
 * 1px shadow. Its border turns to `--ring` while the text area has the focus.
 */
export const composerSurface = `${radius.composer} border border-border/60 bg-background shadow-(--composer-shadow) transition-colors has-[textarea:focus-visible]:border-ring motion-reduce:transition-none dark:bg-popover`;

/** The composer as a bar that floats over content: glass in place of paper. */
export const composerGlass = `${radius.composer} ${floating} ${denseGlass} transition-colors has-[textarea:focus-visible]:border-ring motion-reduce:transition-none`;

/**
 * The root of a layout. It fills the block's frame; in the variants canvas,
 * where the frame has no height, it keeps a height of its own.
 */
export const variantRoot =
  "bg-background text-foreground relative isolate flex h-full min-h-[min(100dvh,40rem)] w-full overflow-hidden";

const press =
  "transition-[background-color,color,border-color,scale,opacity] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100";

/** A round, quiet button that holds one icon: 28px, 36px on touch screens. */
export const iconButtonClass = `text-muted-foreground hover:bg-accent hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground flex size-7 shrink-0 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-40 pointer-coarse:size-9 ${focusBorder} ${press}`;

/** A button with a label, the same height as an icon button. */
export const textButtonClass = `text-foreground hover:bg-accent aria-pressed:bg-accent data-popup-open:bg-accent flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:h-9 ${text.body} ${weight.label} ${focusBorder} ${press}`;

/** The one solid button: send, or the main answer to a question. */
export const primaryButtonClass = `bg-primary text-primary-foreground hover:bg-primary/90 flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 disabled:pointer-events-none disabled:opacity-30 pointer-coarse:h-9 ${text.body} ${weight.label} ${focusBorder} ${press}`;

/** A chip on the page, such as a follow-up: paper, 32px tall. */
export const chipClass = `${paper} text-foreground hover:bg-accent flex h-8 max-w-full shrink-0 items-center gap-2 rounded-full px-3 outline-none focus-visible:border-ring disabled:pointer-events-none disabled:opacity-40 pointer-coarse:h-9 ${text.body} ${weight.label} ${press}`;

/** A row in a menu or a list: 28px tall, 36px on touch screens. */
export const menuRowClass = `${radius.sm} ${weight.regular} flex h-7 w-full shrink-0 cursor-default items-center gap-2 px-2 text-start outline-none select-none pointer-coarse:h-9 [&>svg]:text-muted-foreground`;

/** A row of a list on the page, such as a welcome suggestion or a chat. */
export const listRowClass = `${menuRowClass} hover:bg-accent focus-visible:bg-accent data-active:bg-accent cursor-pointer transition-colors disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none`;

/** A menu's surface: 16px corners, 4px padding, so a 12px row nests exactly. */
export const menuSurfaceClass = `${floating} ${denseGlass} ${radius.lg} ${text.body} text-popover-foreground z-50 flex min-w-44 flex-col p-1 outline-none`;

/** A popover's surface: the menu's glass and corners, with no padding of its own. */
export const popoverSurfaceClass = `${floating} ${denseGlass} ${radius.lg} ${text.body} text-popover-foreground z-50 flex flex-col outline-none`;

const menuItemClass = `${menuRowClass} data-highlighted:bg-accent data-popup-open:bg-accent data-disabled:pointer-events-none data-disabled:opacity-40`;

const destructiveItemClass =
  "text-destructive data-highlighted:bg-(--destructive-subtle) [&>svg]:text-destructive";

/** How a menu, popover or tooltip comes and goes. */
export const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)] data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100";

/* -------------------------------------------------------------------------- */
/* Icons: one helper for both icon sets.                                      */
/* -------------------------------------------------------------------------- */

/** Which icon set the block draws with. */
export type IconTheme = "aiellie" | "lucide";

export const ThemeContext = createContext<IconTheme>("aiellie");

/** One icon in both sets: Hugeicons for the aiellie look, Lucide otherwise. */
export type Glyph = { huge: IconSvgElement; lucide: LucideIcon };

export function Icon({
  huge,
  lucide: Lucide,
  className,
  strokeWidth = 1.5,
}: Glyph & { className?: string; strokeWidth?: number }) {
  const theme = useContext(ThemeContext);
  const classes = cn("size-4 shrink-0", className);
  return theme === "aiellie" ? (
    <HugeiconsIcon
      icon={huge}
      strokeWidth={strokeWidth}
      aria-hidden
      className={classes}
    />
  ) : (
    <Lucide strokeWidth={strokeWidth} aria-hidden className={classes} />
  );
}

const glyph = (huge: IconSvgElement, lucide: LucideIcon): Glyph => ({
  huge,
  lucide,
});

/** The icons the block uses, each paired across the two sets. */
export const icons = {
  add: glyph(Add01Icon, PlusIcon),
  alert: glyph(Alert02Icon, TriangleAlertIcon),
  arrowDown: glyph(ArrowDown02Icon, ArrowDownIcon),
  assistant: glyph(SparklesIcon, LucideSparklesIcon),
  chart: glyph(ChartLineData01Icon, ChartLineIcon),
  chat: glyph(BubbleChatIcon, MessageCircleIcon),
  chevronDown: glyph(ArrowDown01Icon, ChevronDownIcon),
  chevronLeft: glyph(ArrowLeft01Icon, ChevronLeftIcon),
  chevronRight: glyph(ArrowRight01Icon, ChevronRightIcon),
  close: glyph(Cancel01Icon, XIcon),
  code: glyph(SourceCodeIcon, CodeIcon),
  collapse: glyph(ArrowShrink01Icon, Minimize2Icon),
  copy: glyph(Copy01Icon, CopyIcon),
  delete: glyph(Delete02Icon, Trash2Icon),
  edit: glyph(PencilEdit02Icon, PencilIcon),
  expand: glyph(ArrowExpand01Icon, Maximize2Icon),
  grid: glyph(GridViewIcon, LayoutGridIcon),
  history: glyph(TransactionHistoryIcon, HistoryIcon),
  more: glyph(MoreHorizontalIcon, EllipsisIcon),
  newChat: glyph(BubbleChatAddIcon, SquarePenIcon),
  quiz: glyph(HelpCircleIcon, CircleHelpIcon),
  receipt: glyph(Invoice01Icon, ReceiptIcon),
  retry: glyph(RefreshIcon, RefreshCwIcon),
  search: glyph(Search01Icon, SearchIcon),
  send: glyph(ArrowUp02Icon, ArrowUpIcon),
  sidebar: glyph(SidebarLeftIcon, PanelLeftIcon),
  stop: glyph(StopIcon, SquareIcon),
  tick: glyph(Tick02Icon, CheckIcon),
  timer: glyph(Timer01Icon, TimerIcon),
  widget: glyph(DashboardSquare01Icon, LayoutDashboardIcon),
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof icons;

/** The glyph for an icon name from data.json; an unknown name is a widget. */
export const glyphFor = (name: string | undefined): Glyph =>
  (name && (icons as Record<string, Glyph>)[name]) || icons.widget;

/* -------------------------------------------------------------------------- */
/* Tooltip.                                                                   */
/* -------------------------------------------------------------------------- */

type Side = "top" | "bottom" | "left" | "right";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <BaseTooltip.Provider delay={400} closeDelay={0}>
      {children}
    </BaseTooltip.Provider>
  );
}

/** A label that shows on hover and on keyboard focus of its one child. */
export function Tooltip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: Side;
  children: ReactElement;
}) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={8} className="z-60">
          <BaseTooltip.Popup
            className={cn(
              "bg-foreground text-background px-2 py-1",
              radius.sm,
              text.small,
              weight.label,
              popupMotion,
            )}
          >
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons, the avatar and the live dot.                                      */
/* -------------------------------------------------------------------------- */

type IconButtonProps = Omit<ComponentProps<"button">, "children"> & {
  /** The accessible name, and the tooltip unless `tooltip` is given. */
  label: string;
  /** The tooltip, when it says more than the name does, such as a shortcut. */
  tooltip?: string;
  icon: Glyph;
  /** Where the tooltip opens. */
  side?: Side;
  /** A toggle that is on. Sets `aria-pressed`. */
  active?: boolean;
};

/**
 * An icon button with a tooltip. It forwards every other prop to the button,
 * so it works under `asChild` and as `render` for a menu or popover trigger.
 */
export function IconButton({
  label,
  tooltip = label,
  icon,
  side,
  active,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <Tooltip label={tooltip} {...(side ? { side } : {})}>
      <button
        type={type}
        aria-label={label}
        {...(active === undefined ? {} : { "aria-pressed": active })}
        className={cn(iconButtonClass, className)}
        {...props}
      >
        <Icon {...icon} />
      </button>
    </Tooltip>
  );
}

const avatarSizes = {
  xs: "size-5 text-[0.625rem]",
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
} as const;

/**
 * A picture of a person or of the assistant: round, with a hairline edge. It
 * shows the first letter of the name when the picture cannot load.
 */
export function Avatar({
  src,
  name,
  size = "sm",
  decorative = false,
  className,
}: {
  src: string;
  name: string;
  size?: keyof typeof avatarSizes;
  /** The name is written or read out beside the picture, so it is not named twice. */
  decorative?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);

  return (
    <span
      {...(decorative ? { "aria-hidden": true } : {})}
      className={cn(
        "bg-muted text-muted-foreground after:border-border relative flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:mix-blend-darken dark:after:mix-blend-lighten",
        avatarSizes[size],
        weight.label,
        className,
      )}
    >
      {failed === src ? (
        <span role="img" aria-label={name}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      ) : (
        <img
          src={src}
          alt={decorative ? "" : name}
          draggable={false}
          className="size-full object-cover text-transparent"
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
}

/** The blue dot beside something that is being written right now. */
export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("gfc-live-dot", className)} />;
}

/** Copies `text`, and shows a tick for a moment once it has. */
export function CopyButton({
  text: copied,
  label = "Copy",
  side,
  className,
}: {
  text: string;
  label?: string;
  side?: Side;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 1500);
    return () => clearTimeout(timer);
  }, [done]);

  return (
    <IconButton
      label={done ? "Copied" : label}
      icon={done ? icons.tick : icons.copy}
      {...(side ? { side } : {})}
      {...(className ? { className } : {})}
      disabled={!copied}
      onClick={() => {
        void navigator.clipboard.writeText(copied).then(
          () => setDone(true),
          () => {},
        );
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Menu, on Base UI. Arrow keys, typeahead and Escape come with it.           */
/* -------------------------------------------------------------------------- */

// Base UI also takes a function as `className`; these parts take a string.
type Styled<Props> = Omit<Props, "className"> & { className?: string };

type Placement = {
  side?: Side;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
};

export const Menu = BaseMenu.Root;

/** Pass the button as `render`, for example an `IconButton`. */
export const MenuTrigger = BaseMenu.Trigger;

export function MenuContent({
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  className,
  ...props
}: Styled<ComponentProps<typeof BaseMenu.Popup>> & Placement) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={8}
        className="z-50 outline-none"
      >
        <BaseMenu.Popup
          className={cn(
            menuSurfaceClass,
            popupMotion,
            "max-h-(--available-height) overflow-y-auto",
            className,
          )}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export function MenuItem({
  destructive,
  className,
  ...props
}: Styled<ComponentProps<typeof BaseMenu.Item>> & {
  /** Draws the row in the destructive color, for a delete. */
  destructive?: boolean;
}) {
  return (
    <BaseMenu.Item
      className={cn(
        menuItemClass,
        destructive && destructiveItemClass,
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: Styled<ComponentProps<typeof BaseMenu.Separator>>) {
  return (
    <BaseMenu.Separator
      className={cn("bg-border/60 mx-2 my-1 h-px shrink-0", className)}
      {...props}
    />
  );
}

/** A caption over a set of rows, in a menu or in a list on the page. */
export function MenuLabel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="presentation"
      className={cn(
        "text-muted-foreground flex h-7 shrink-0 items-center px-2",
        text.small,
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Popover, on Base UI: a floating panel. Escape closes it and focus returns  */
/* to its trigger.                                                            */
/* -------------------------------------------------------------------------- */

export const Popover = BasePopover.Root;

/** Pass the button as `render`, for example an `IconButton`. */
export const PopoverTrigger = BasePopover.Trigger;

export const PopoverClose = BasePopover.Close;

/** The panel. It has no padding of its own; give it an `aria-label`. */
export function PopoverContent({
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  className,
  ...props
}: Styled<ComponentProps<typeof BasePopover.Popup>> & Placement) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={8}
        className="z-50 outline-none"
      >
        <BasePopover.Popup
          className={cn(popoverSurfaceClass, popupMotion, className)}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* Message text and the composer.                                             */
/* -------------------------------------------------------------------------- */

const remarkPlugins = [remarkGfm];

/** The text of the part being rendered, as Markdown. Use it for a text part. */
export function MarkdownText({ className }: { className?: string }) {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={remarkPlugins}
      className={cn("gfc-prose", className)}
    />
  );
}

const composerInputs = new Set<HTMLTextAreaElement>();

/**
 * The `ref` of a composer's text area. `<Composer>` sets it; a composer built
 * by hand passes it to `ComposerPrimitive.Input`, so `focusComposer` finds it.
 */
export const composerInputRef = (element: HTMLTextAreaElement | null) => {
  for (const input of composerInputs) {
    if (!input.isConnected) composerInputs.delete(input);
  }
  if (element) composerInputs.add(element);
};

/** Moves the focus to the composer on screen, with the caret after its text. */
export function focusComposer() {
  requestAnimationFrame(() => {
    const input = [...composerInputs].findLast(
      (element) => element.isConnected && element.getClientRects().length > 0,
    );
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
}

/**
 * The composer: a text area that grows, with Send, or Stop while a reply is
 * being written. Enter sends and Shift+Enter starts a new line. `children`
 * sit at the start of the button row, for a layout's own controls.
 */
export function Composer({
  surface = "paper",
  placeholder = "Ask for a widget",
  autoFocus,
  className,
  children,
}: {
  /** `glass` is for a bar that floats over content. */
  surface?: "paper" | "glass";
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const running = useAuiState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root
      className={cn(
        surface === "glass" ? composerGlass : composerSurface,
        "flex w-full flex-col p-2",
        className,
      )}
    >
      <ComposerPrimitive.Input
        ref={composerInputRef}
        rows={1}
        placeholder={placeholder}
        aria-label="Message the assistant"
        {...(autoFocus ? { autoFocus } : {})}
        className="placeholder:text-muted-foreground/60 max-h-40 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base leading-6 outline-none"
      />
      <div className="flex items-center gap-1">
        {children}
        <span className="min-w-0 flex-1" />
        {running ? (
          <ComposerPrimitive.Cancel asChild>
            <IconButton
              label="Stop"
              icon={icons.stop}
              side="top"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground [&>svg]:size-3 [&>svg]:fill-current"
            />
          </ComposerPrimitive.Cancel>
        ) : (
          <ComposerPrimitive.Send asChild>
            <IconButton
              label="Send"
              icon={icons.send}
              side="top"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground disabled:opacity-30"
            />
          </ComposerPrimitive.Send>
        )}
      </div>
    </ComposerPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* The chats of this visit.                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The chat list: start one, open one, delete one. Chats are kept in memory
 * and named after their first message. `onPick` runs just before a chat is
 * opened or started, so a popover or a drawer that holds the list can close.
 */
export function ChatList({
  onPick,
  className,
}: {
  onPick?: () => void;
  className?: string;
}) {
  const newChat = useRef<HTMLButtonElement>(null);

  return (
    <ThreadListPrimitive.Root
      className={cn("flex min-h-0 flex-col gap-px", className)}
    >
      <ThreadListPrimitive.New
        ref={newChat}
        onClick={onPick}
        className={listRowClass}
      >
        <Icon {...icons.newChat} />
        New chat
      </ThreadListPrimitive.New>
      <AuiIf condition={(s) => s.threads.threadIds.length === 0}>
        <p className={cn("text-muted-foreground px-2 py-1.5", text.bodySm)}>
          Chats from this visit are listed here.
        </p>
      </AuiIf>
      <ThreadListPrimitive.Items>
        {() => (
          <ChatRow
            {...(onPick ? { onPick } : {})}
            onDelete={() => newChat.current?.focus()}
          />
        )}
      </ThreadListPrimitive.Items>
    </ThreadListPrimitive.Root>
  );
}

/**
 * One chat of the list: open it, or delete it. Render it from
 * `ThreadListPrimitive.Items`. The row goes with its chat, so `onDelete` has
 * to move the focus to something that stays.
 */
export function ChatRow({
  onPick,
  onDelete,
}: {
  onPick?: () => void;
  onDelete: () => void;
}) {
  return (
    <ThreadListItemPrimitive.Root
      className={cn(
        radius.sm,
        "group hover:bg-accent data-active:bg-accent has-[:focus-visible]:bg-accent relative flex shrink-0 items-center transition-colors motion-reduce:transition-none",
      )}
    >
      <ThreadListItemPrimitive.Trigger
        onClick={onPick}
        className={cn(menuRowClass, "min-w-0 flex-1 cursor-pointer pe-8")}
      >
        <span className="truncate">
          <ThreadListItemPrimitive.Title fallback="New chat" />
        </span>
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemPrimitive.Delete asChild onClick={onDelete}>
        <IconButton
          label="Delete this chat"
          icon={icons.delete}
          side="top"
          className="hover:text-destructive absolute end-0.5 size-6 opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 pointer-coarse:size-8 pointer-coarse:opacity-100"
        />
      </ThreadListItemPrimitive.Delete>
    </ThreadListItemPrimitive.Root>
  );
}
