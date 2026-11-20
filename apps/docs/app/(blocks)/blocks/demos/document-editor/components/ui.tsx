"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Calendar03Icon,
  Cancel01Icon,
  CheckListIcon,
  Comment01Icon,
  CommentAdd01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  DragDropVerticalIcon,
  File01Icon,
  FileAddIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  InsertRowDownIcon,
  KanbanIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  MinusSignIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  QuoteDownIcon,
  SourceCodeIcon,
  SparklesIcon,
  StopIcon,
  TextBoldIcon,
  TextIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  ThumbsUpIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowUpIcon,
  BetweenHorizontalEndIcon,
  BoldIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  FileIcon,
  FilePlusIcon,
  GripVerticalIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  KanbanIcon as LucideKanbanIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon as LucideSparklesIcon,
  SquareIcon,
  StrikethroughIcon,
  TextQuoteIcon,
  ThumbsUpIcon as LucideThumbsUpIcon,
  Trash2Icon,
  TypeIcon,
  UnderlineIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Class strings every piece shares.                                          */
/* -------------------------------------------------------------------------- */

/** Corners, stepped around `--radius` (16px) so a nested corner fits. */
export const radius = {
  sm: "rounded-[calc(var(--radius)-4px)]",
  md: "rounded-[calc(var(--radius)-2px)]",
  lg: "rounded-(--radius)",
  xl: "rounded-[calc(var(--radius)+4px)]",
} as const;

/** The type styles of the interface. The document sets its own, larger sizes. */
export const text = {
  body: "text-sm leading-5",
  bodySm: "text-[0.8125rem] leading-[1.125rem]",
  small: "text-xs leading-4",
} as const;

export const weight = {
  regular: "font-(--weight-regular)",
  label: "font-(--weight-label)",
  strong: "font-(--weight-strong)",
  heading: "font-(--weight-heading)",
} as const;

/** Translucent and blurred, for anything that floats over the page. */
export const glass =
  "border border-border/60 bg-(--glass) backdrop-blur-(--glass-blur) [--accent:var(--glass-hover)] [--muted-foreground:var(--glass-muted-foreground)] not-supports-[backdrop-filter:blur(1px)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

/** Glass with the one shadow: menus, popovers, pills, the assistant bar. */
export const floating = `${glass} shadow-(--float-shadow)`;

/** Denser glass, for a surface whose own text has to read over the page's. */
export const denseGlass =
  "[--glass-blur:20px] [--glass:color-mix(in_oklab,var(--popover)_86%,transparent)]";

/** A quiet raised surface on the page. */
export const paper = "border border-border/60 bg-background dark:bg-popover";

/** A filled area with no border: a composer, a user message. */
export const field = "bg-foreground/4 dark:bg-foreground/6";

/** No ring on focus; a keyboard focus turns the border to `--ring`. */
export const focusBorder =
  "border border-transparent outline-none focus-visible:border-ring";

const press =
  "transition-[background-color,color,border-color,scale] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100";

/** A round, quiet button that holds one icon: 28px, 36px on touch screens. */
export const iconButtonClass = `text-muted-foreground hover:bg-accent hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground flex size-7 shrink-0 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-40 pointer-coarse:size-9 ${focusBorder} ${press}`;

/** A button with a label, the same height as an icon button. */
export const textButtonClass = `text-foreground hover:bg-accent data-popup-open:bg-accent flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:h-9 ${text.body} ${weight.label} ${focusBorder} ${press}`;

/** A chip on the page: paper, 32px tall. */
export const chipClass = `${paper} text-foreground hover:bg-accent flex h-8 shrink-0 items-center gap-2 rounded-full px-3 pointer-coarse:h-9 ${text.body} ${weight.label} outline-none focus-visible:border-ring ${press}`;

/** A menu's surface: 16px corners, 4px padding, so a 12px row nests exactly. */
export const menuSurfaceClass = `${floating} ${denseGlass} ${radius.lg} ${text.body} text-popover-foreground z-50 flex min-w-44 flex-col p-1 outline-none`;

/** A row in a menu or a list: 28px tall, 36px on touch screens. */
export const menuRowClass = `${radius.sm} ${weight.regular} flex h-7 w-full shrink-0 cursor-default items-center gap-2 px-2 text-start outline-none select-none pointer-coarse:h-9 [&>svg]:text-muted-foreground`;

const menuItemClass = `${menuRowClass} data-highlighted:bg-accent data-popup-open:bg-accent data-disabled:pointer-events-none data-disabled:opacity-40`;

const destructiveItemClass =
  "text-destructive data-highlighted:bg-(--destructive-subtle) [&>svg]:text-destructive";

const popupMotion =
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
  assistant: glyph(SparklesIcon, LucideSparklesIcon),
  bold: glyph(TextBoldIcon, BoldIcon),
  bullet: glyph(LeftToRightListBulletIcon, ListIcon),
  calendar: glyph(Calendar03Icon, CalendarIcon),
  check: glyph(CheckListIcon, ListTodoIcon),
  chevronDown: glyph(ArrowDown01Icon, ChevronDownIcon),
  chevronRight: glyph(ArrowRight01Icon, ChevronRightIcon),
  close: glyph(Cancel01Icon, XIcon),
  code: glyph(SourceCodeIcon, CodeIcon),
  comment: glyph(Comment01Icon, MessageSquareIcon),
  commentAdd: glyph(CommentAdd01Icon, MessageSquarePlusIcon),
  delete: glyph(Delete02Icon, Trash2Icon),
  divider: glyph(MinusSignIcon, MinusIcon),
  download: glyph(Download01Icon, DownloadIcon),
  duplicate: glyph(Copy01Icon, CopyIcon),
  feedback: glyph(ThumbsUpIcon, LucideThumbsUpIcon),
  grip: glyph(DragDropVerticalIcon, GripVerticalIcon),
  h1: glyph(Heading01Icon, Heading1Icon),
  h2: glyph(Heading02Icon, Heading2Icon),
  h3: glyph(Heading03Icon, Heading3Icon),
  insertBelow: glyph(InsertRowDownIcon, BetweenHorizontalEndIcon),
  italic: glyph(TextItalicIcon, ItalicIcon),
  more: glyph(MoreHorizontalIcon, EllipsisIcon),
  numbered: glyph(LeftToRightListNumberIcon, ListOrderedIcon),
  page: glyph(File01Icon, FileIcon),
  pageAdd: glyph(FileAddIcon, FilePlusIcon),
  quote: glyph(QuoteDownIcon, TextQuoteIcon),
  rename: glyph(PencilEdit02Icon, PencilIcon),
  send: glyph(ArrowUp02Icon, ArrowUpIcon),
  stop: glyph(StopIcon, SquareIcon),
  strike: glyph(TextStrikethroughIcon, StrikethroughIcon),
  text: glyph(TextIcon, TypeIcon),
  tick: glyph(Tick02Icon, CheckIcon),
  tracker: glyph(KanbanIcon, LucideKanbanIcon),
  underline: glyph(TextUnderlineIcon, UnderlineIcon),
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof icons;

/** The icon a page or template names in data.json, or the page icon. */
export const glyphFor = (name: string | undefined): Glyph =>
  (name && (icons as Record<string, Glyph>)[name]) || icons.page;

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
/* Buttons and the floating pill.                                             */
/* -------------------------------------------------------------------------- */

type IconButtonProps = Omit<ComponentProps<"button">, "children"> & {
  /** The accessible name, also shown as the tooltip. */
  label: string;
  icon: Glyph;
  /** Where the tooltip opens. */
  side?: Side;
  /** A toggle that is on. Sets `aria-pressed`. */
  active?: boolean;
};

/**
 * An icon button with a tooltip. It forwards every other prop to the button,
 * so it also works as `render` for a `MenuTrigger`.
 */
export function IconButton({
  label,
  icon,
  side,
  active,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <Tooltip label={label} {...(side ? { side } : {})}>
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

/** The floating glass capsule that holds the controls over the page. */
export function Pill({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        floating,
        "flex h-10 items-center gap-0.5 rounded-full p-1",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Menu, on Base UI. Arrow keys, typeahead and Escape come with it.           */
/* -------------------------------------------------------------------------- */

// Base UI also takes a function as `className`; these parts take a string.
type Styled<Props> = Omit<Props, "className"> & { className?: string };

export const Menu = BaseMenu.Root;
export const SubMenu = BaseMenu.SubmenuRoot;

/** Pass the button as `render`, for example an `IconButton`. */
export const MenuTrigger = BaseMenu.Trigger;

type MenuContentProps = Styled<ComponentProps<typeof BaseMenu.Popup>> & {
  side?: Side;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
};

export function MenuContent({
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  className,
  ...props
}: MenuContentProps) {
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

type MenuItemProps = Styled<ComponentProps<typeof BaseMenu.Item>> & {
  /** Draws the row in the destructive color, for a delete. */
  destructive?: boolean;
};

export function MenuItem({ destructive, className, ...props }: MenuItemProps) {
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

/** A row that toggles, with a tick at its end while it is on. */
export function MenuCheckboxItem({
  className,
  children,
  ...props
}: Styled<ComponentProps<typeof BaseMenu.CheckboxItem>>) {
  return (
    <BaseMenu.CheckboxItem className={cn(menuItemClass, className)} {...props}>
      {children}
      <BaseMenu.CheckboxItemIndicator className="ms-auto flex ps-2">
        <Icon {...icons.tick} className="text-foreground" />
      </BaseMenu.CheckboxItemIndicator>
    </BaseMenu.CheckboxItem>
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

/** A caption over a set of rows. */
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

/** A row that opens a submenu, with a chevron at its end. */
export function SubMenuTrigger({
  className,
  children,
  ...props
}: Styled<ComponentProps<typeof BaseMenu.SubmenuTrigger>>) {
  return (
    <BaseMenu.SubmenuTrigger
      className={cn(menuItemClass, className)}
      {...props}
    >
      {children}
      <Icon {...icons.chevronRight} className="ms-auto size-3.5" />
    </BaseMenu.SubmenuTrigger>
  );
}

export function SubMenuContent({
  sideOffset = 6,
  alignOffset = -5,
  ...props
}: MenuContentProps) {
  return (
    <MenuContent
      side="right"
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      {...props}
    />
  );
}
