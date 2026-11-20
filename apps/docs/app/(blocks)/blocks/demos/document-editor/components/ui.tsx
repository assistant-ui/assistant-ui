"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  Add01Icon,
  Airplane01Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp02Icon,
  AtIcon,
  Attachment01Icon,
  Award01Icon,
  BookOpen01Icon,
  Bookmark01Icon,
  Briefcase01Icon,
  Building01Icon,
  Calendar03Icon,
  Camera01Icon,
  Cancel01Icon,
  ChartLineData01Icon,
  CheckListIcon,
  Clock01Icon,
  Coffee01Icon,
  Comment01Icon,
  CommentAdd01Icon,
  Copy01Icon,
  CursorRectangleSelection01Icon,
  Delete02Icon,
  Dollar01Icon,
  Download01Icon,
  DragDropVerticalIcon,
  FavouriteIcon,
  File01Icon,
  FileAddIcon,
  FireIcon,
  Flag01Icon,
  FlashIcon,
  Folder01Icon,
  GiftIcon,
  Globe02Icon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  Home01Icon,
  Idea01Icon,
  Image01Icon,
  InsertColumnLeftIcon,
  InsertColumnRightIcon,
  InsertRowDownIcon,
  InsertRowUpIcon,
  KanbanIcon,
  Key01Icon,
  Leaf01Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  Location01Icon,
  LockIcon,
  Mail01Icon,
  Mic01Icon,
  MinusSignIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  MusicNote01Icon,
  Notebook01Icon,
  PaintBoardIcon,
  PencilEdit02Icon,
  PuzzleIcon,
  QuoteDownIcon,
  RepeatIcon,
  Rocket01Icon,
  Search01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
  SmileIcon,
  SourceCodeIcon,
  SparklesIcon,
  StarIcon,
  StopIcon,
  Sun01Icon,
  Table01Icon,
  Tag01Icon,
  Target01Icon,
  TextBoldIcon,
  TextIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  ThumbsUpIcon,
  Tick02Icon,
  TouchInteraction01Icon,
  TransactionHistoryIcon,
  Undo02Icon,
  UserGroupIcon,
  UserIcon,
  WavingHand01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  AtSignIcon,
  AwardIcon,
  BetweenHorizontalEndIcon,
  BetweenHorizontalStartIcon,
  BetweenVerticalEndIcon,
  BetweenVerticalStartIcon,
  BoldIcon,
  BookOpenIcon,
  BookmarkIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarIcon,
  CameraIcon,
  ChartLineIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CodeIcon,
  CoffeeIcon,
  CopyIcon,
  DollarSignIcon,
  DownloadIcon,
  EllipsisIcon,
  EllipsisVerticalIcon,
  FileIcon,
  FilePlusIcon,
  FlagIcon,
  FlameIcon,
  FolderIcon,
  GiftIcon as LucideGiftIcon,
  GlobeIcon,
  GripVerticalIcon,
  HandIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  HeartIcon,
  HistoryIcon,
  HomeIcon,
  ImageIcon,
  ItalicIcon,
  KanbanIcon as LucideKanbanIcon,
  KeyIcon,
  LeafIcon,
  LightbulbIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  LockIcon as LucideLockIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  MicIcon,
  MinusIcon,
  MoonIcon,
  MousePointerClickIcon,
  MusicIcon,
  NotebookIcon,
  PaletteIcon,
  PaperclipIcon,
  PencilIcon,
  PlaneIcon,
  PlusIcon,
  PuzzleIcon as LucidePuzzleIcon,
  RepeatIcon as LucideRepeatIcon,
  RocketIcon,
  SearchIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SmileIcon as LucideSmileIcon,
  SparklesIcon as LucideSparklesIcon,
  SquareDashedMousePointerIcon,
  SquareIcon,
  StarIcon as LucideStarIcon,
  StrikethroughIcon,
  SunIcon,
  TableIcon,
  TagIcon,
  TargetIcon,
  TextQuoteIcon,
  ThumbsUpIcon as LucideThumbsUpIcon,
  Trash2Icon,
  TypeIcon,
  UnderlineIcon,
  Undo2Icon,
  UserIcon as LucideUserIcon,
  UsersIcon,
  XIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { PageIcon } from "../lib/document";

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

/** The one solid button: the main answer to a question, such as Accept. */
export const primaryButtonClass = `bg-primary text-primary-foreground hover:bg-primary/90 flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:h-9 ${text.body} ${weight.label} ${focusBorder} ${press}`;

/**
 * The pills at the top of the page: 32px buttons that sit 2px from the edge
 * on every side and 2px from each other, in a pill 36px tall. `Pill` takes
 * `pill`, `IconButton` takes `size="md"`, and a class string takes `icon` or
 * `text` after `iconButtonClass` or `textButtonClass`.
 */
export const topPill = {
  pill: "h-9 gap-0.5 p-px pointer-coarse:h-10",
  icon: "size-8",
  text: "h-8 px-3",
} as const;

/** A chip on the page: paper, 32px tall. */
export const chipClass = `${paper} text-foreground hover:bg-accent flex h-8 shrink-0 items-center gap-2 rounded-full px-3 pointer-coarse:h-9 ${text.body} ${weight.label} outline-none focus-visible:border-ring ${press}`;

/** A menu's surface: 16px corners, 4px padding, so a 12px row nests exactly. */
export const menuSurfaceClass = `${floating} ${denseGlass} ${radius.lg} ${text.body} text-popover-foreground z-50 flex min-w-44 flex-col p-1 outline-none`;

/** A row in a menu or a list: 28px tall, 36px on touch screens. */
export const menuRowClass = `${radius.sm} ${weight.regular} flex h-7 w-full shrink-0 cursor-default items-center gap-2 px-2 text-start outline-none select-none pointer-coarse:h-9 [&>svg]:text-muted-foreground`;

/** A popover's surface: the menu's glass and corners, with no padding of its own. */
export const popoverSurfaceClass = `${floating} ${denseGlass} ${radius.lg} ${text.body} text-popover-foreground z-50 flex flex-col outline-none`;

const menuItemClass = `${menuRowClass} data-highlighted:bg-accent data-popup-open:bg-accent data-disabled:pointer-events-none data-disabled:opacity-40`;

const destructiveItemClass =
  "text-destructive data-highlighted:bg-(--destructive-subtle) [&>svg]:text-destructive";

/** How a menu, popover or card comes and goes. */
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
  arrowDown: glyph(ArrowDown02Icon, ArrowDownIcon),
  arrowLeft: glyph(ArrowLeft02Icon, ArrowLeftIcon),
  arrowRight: glyph(ArrowRight02Icon, ArrowRightIcon),
  arrowUp: glyph(ArrowUp02Icon, ArrowUpIcon),
  askAi: glyph(CursorRectangleSelection01Icon, SquareDashedMousePointerIcon),
  assistant: glyph(SparklesIcon, LucideSparklesIcon),
  at: glyph(AtIcon, AtSignIcon),
  attach: glyph(Attachment01Icon, PaperclipIcon),
  auto: glyph(FlashIcon, ZapIcon),
  bold: glyph(TextBoldIcon, BoldIcon),
  bullet: glyph(LeftToRightListBulletIcon, ListIcon),
  calendar: glyph(Calendar03Icon, CalendarIcon),
  check: glyph(CheckListIcon, ListTodoIcon),
  chevronDown: glyph(ArrowDown01Icon, ChevronDownIcon),
  chevronRight: glyph(ArrowRight01Icon, ChevronRightIcon),
  close: glyph(Cancel01Icon, XIcon),
  code: glyph(SourceCodeIcon, CodeIcon),
  columnLeft: glyph(InsertColumnLeftIcon, BetweenVerticalStartIcon),
  columnRight: glyph(InsertColumnRightIcon, BetweenVerticalEndIcon),
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
  history: glyph(TransactionHistoryIcon, HistoryIcon),
  insertBelow: glyph(InsertRowDownIcon, BetweenHorizontalEndIcon),
  italic: glyph(TextItalicIcon, ItalicIcon),
  link: glyph(Link01Icon, LinkIcon),
  manual: glyph(TouchInteraction01Icon, MousePointerClickIcon),
  mic: glyph(Mic01Icon, MicIcon),
  more: glyph(MoreHorizontalIcon, EllipsisIcon),
  moreVertical: glyph(MoreVerticalIcon, EllipsisVerticalIcon),
  numbered: glyph(LeftToRightListNumberIcon, ListOrderedIcon),
  page: glyph(File01Icon, FileIcon),
  pageAdd: glyph(FileAddIcon, FilePlusIcon),
  quote: glyph(QuoteDownIcon, TextQuoteIcon),
  rename: glyph(PencilEdit02Icon, PencilIcon),
  rowAbove: glyph(InsertRowUpIcon, BetweenHorizontalStartIcon),
  search: glyph(Search01Icon, SearchIcon),
  send: glyph(ArrowUp02Icon, ArrowUpIcon),
  smile: glyph(SmileIcon, LucideSmileIcon),
  stop: glyph(StopIcon, SquareIcon),
  strike: glyph(TextStrikethroughIcon, StrikethroughIcon),
  table: glyph(Table01Icon, TableIcon),
  text: glyph(TextIcon, TypeIcon),
  tick: glyph(Tick02Icon, CheckIcon),
  tracker: glyph(KanbanIcon, LucideKanbanIcon),
  turnInto: glyph(RepeatIcon, LucideRepeatIcon),
  underline: glyph(TextUnderlineIcon, UnderlineIcon),
  undo: glyph(Undo02Icon, Undo2Icon),
  welcome: glyph(WavingHand01Icon, HandIcon),
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof icons;

/** The icons a page can wear, in the order the icon picker lays them out. */
export const PAGE_ICONS: readonly {
  name: string;
  label: string;
  glyph: Glyph;
}[] = [
  { name: "page", label: "Page", glyph: icons.page },
  {
    name: "notebook",
    label: "Notebook",
    glyph: glyph(Notebook01Icon, NotebookIcon),
  },
  { name: "book", label: "Book", glyph: glyph(BookOpen01Icon, BookOpenIcon) },
  { name: "folder", label: "Folder", glyph: glyph(Folder01Icon, FolderIcon) },
  {
    name: "bookmark",
    label: "Bookmark",
    glyph: glyph(Bookmark01Icon, BookmarkIcon),
  },
  { name: "tag", label: "Tag", glyph: glyph(Tag01Icon, TagIcon) },
  { name: "check", label: "Checklist", glyph: icons.check },
  { name: "tracker", label: "Board", glyph: icons.tracker },
  { name: "calendar", label: "Calendar", glyph: icons.calendar },
  { name: "clock", label: "Clock", glyph: glyph(Clock01Icon, ClockIcon) },
  { name: "target", label: "Target", glyph: glyph(Target01Icon, TargetIcon) },
  { name: "flag", label: "Flag", glyph: glyph(Flag01Icon, FlagIcon) },
  { name: "rocket", label: "Rocket", glyph: glyph(Rocket01Icon, RocketIcon) },
  { name: "idea", label: "Idea", glyph: glyph(Idea01Icon, LightbulbIcon) },
  { name: "star", label: "Star", glyph: glyph(StarIcon, LucideStarIcon) },
  { name: "heart", label: "Heart", glyph: glyph(FavouriteIcon, HeartIcon) },
  { name: "home", label: "Home", glyph: glyph(Home01Icon, HomeIcon) },
  {
    name: "briefcase",
    label: "Briefcase",
    glyph: glyph(Briefcase01Icon, BriefcaseIcon),
  },
  {
    name: "building",
    label: "Building",
    glyph: glyph(Building01Icon, Building2Icon),
  },
  { name: "user", label: "Person", glyph: glyph(UserIcon, LucideUserIcon) },
  { name: "team", label: "Team", glyph: glyph(UserGroupIcon, UsersIcon) },
  { name: "comment", label: "Comment", glyph: icons.comment },
  { name: "mail", label: "Mail", glyph: glyph(Mail01Icon, MailIcon) },
  { name: "feedback", label: "Thumbs up", glyph: icons.feedback },
  {
    name: "chart",
    label: "Chart",
    glyph: glyph(ChartLineData01Icon, ChartLineIcon),
  },
  { name: "money", label: "Money", glyph: glyph(Dollar01Icon, DollarSignIcon) },
  {
    name: "bag",
    label: "Shopping bag",
    glyph: glyph(ShoppingBag01Icon, ShoppingBagIcon),
  },
  { name: "gift", label: "Gift", glyph: glyph(GiftIcon, LucideGiftIcon) },
  { name: "award", label: "Award", glyph: glyph(Award01Icon, AwardIcon) },
  {
    name: "puzzle",
    label: "Puzzle",
    glyph: glyph(PuzzleIcon, LucidePuzzleIcon),
  },
  { name: "key", label: "Key", glyph: glyph(Key01Icon, KeyIcon) },
  { name: "lock", label: "Lock", glyph: glyph(LockIcon, LucideLockIcon) },
  { name: "code", label: "Code", glyph: icons.code },
  {
    name: "settings",
    label: "Settings",
    glyph: glyph(Settings01Icon, SettingsIcon),
  },
  { name: "assistant", label: "Sparkles", glyph: icons.assistant },
  {
    name: "palette",
    label: "Palette",
    glyph: glyph(PaintBoardIcon, PaletteIcon),
  },
  { name: "image", label: "Image", glyph: glyph(Image01Icon, ImageIcon) },
  { name: "camera", label: "Camera", glyph: glyph(Camera01Icon, CameraIcon) },
  { name: "music", label: "Music", glyph: glyph(MusicNote01Icon, MusicIcon) },
  { name: "coffee", label: "Coffee", glyph: glyph(Coffee01Icon, CoffeeIcon) },
  { name: "globe", label: "Globe", glyph: glyph(Globe02Icon, GlobeIcon) },
  { name: "pin", label: "Place", glyph: glyph(Location01Icon, MapPinIcon) },
  { name: "plane", label: "Plane", glyph: glyph(Airplane01Icon, PlaneIcon) },
  { name: "sun", label: "Sun", glyph: glyph(Sun01Icon, SunIcon) },
  { name: "moon", label: "Moon", glyph: glyph(Moon02Icon, MoonIcon) },
  { name: "leaf", label: "Leaf", glyph: glyph(Leaf01Icon, LeafIcon) },
  { name: "fire", label: "Fire", glyph: glyph(FireIcon, FlameIcon) },
  { name: "welcome", label: "Wave", glyph: icons.welcome },
];

const pageGlyphs = new Map(PAGE_ICONS.map((icon) => [icon.name, icon.glyph]));

/**
 * The glyph for an icon name from data.json or a page's icon. A page with an
 * emoji or with no icon gets the page glyph; `PageGlyph` draws the emoji.
 */
export const glyphFor = (icon: string | PageIcon | undefined): Glyph => {
  const name =
    typeof icon === "string"
      ? icon
      : icon?.kind === "icon"
        ? icon.value
        : undefined;
  return (
    (name &&
      ((icons as Record<string, Glyph>)[name] ?? pageGlyphs.get(name))) ||
    icons.page
  );
};

/** A page's icon at the size of the text around it: its emoji, or its glyph. */
export function PageGlyph({
  icon,
  className,
}: {
  icon: PageIcon | undefined;
  className?: string;
}) {
  if (icon?.kind === "emoji") {
    return (
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center text-sm leading-none",
          className,
        )}
      >
        {icon.value}
      </span>
    );
  }
  return <Icon {...glyphFor(icon)} {...(className ? { className } : {})} />;
}

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
  /** `md` is the 32px button of the top pills. */
  size?: "sm" | "md";
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
  size = "sm",
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
        className={cn(
          iconButtonClass,
          size === "md" && topPill.icon,
          className,
        )}
        {...props}
      >
        <Icon {...icon} />
      </button>
    </Tooltip>
  );
}

/**
 * The floating glass capsule that holds the controls over the page. `top` is
 * the tighter pill at the top of the page, for `size="md"` buttons.
 */
export function Pill({
  variant = "default",
  className,
  ...props
}: ComponentProps<"div"> & { variant?: "default" | "top" }) {
  return (
    <div
      className={cn(
        floating,
        "flex h-10 items-center gap-0.5 rounded-full p-1",
        variant === "top" && topPill.pill,
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Avatar and the unseen dot.                                                 */
/* -------------------------------------------------------------------------- */

const avatarSizes = {
  xs: "size-5 text-[0.625rem]",
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
} as const;

/**
 * A person's picture: round, with a hairline edge. It is grey while the
 * picture loads, and shows the first letter of the name when it cannot.
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

/**
 * A small dot in the brand color on the corner of a control, for something
 * new. With a `label` it is announced; without, it is decoration and the
 * control's own name should say what is new.
 */
export function Badge({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      {...(label
        ? { role: "status", "aria-label": label }
        : { "aria-hidden": true })}
      className={cn(
        "ring-background block size-2 shrink-0 rounded-full bg-(--brand) ring-2",
        className,
      )}
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

export const MenuRadioGroup = BaseMenu.RadioGroup;

/** One choice of a `MenuRadioGroup`, with a tick at its end while it is chosen. */
export function MenuRadioItem({
  className,
  children,
  ...props
}: Styled<ComponentProps<typeof BaseMenu.RadioItem>>) {
  return (
    <BaseMenu.RadioItem className={cn(menuItemClass, className)} {...props}>
      {children}
      <BaseMenu.RadioItemIndicator className="ms-auto flex ps-2">
        <Icon {...icons.tick} className="text-foreground" />
      </BaseMenu.RadioItemIndicator>
    </BaseMenu.RadioItem>
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

/* -------------------------------------------------------------------------- */
/* Popover, on Base UI: a floating panel for a picker. Escape closes it and   */
/* focus returns to its trigger.                                              */
/* -------------------------------------------------------------------------- */

export const Popover = BasePopover.Root;

/** Pass the button as `render`, for example an `IconButton`. */
export const PopoverTrigger = BasePopover.Trigger;

export const PopoverClose = BasePopover.Close;

type PopoverContentProps = Styled<ComponentProps<typeof BasePopover.Popup>> & {
  side?: Side;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
};

/** The panel. It has no padding of its own; give it an `aria-label`. */
export function PopoverContent({
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  className,
  ...props
}: PopoverContentProps) {
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
