"use client";

import {
  type ComponentProps,
  type ReactElement,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
  useImperativeHandle,
  type PointerEvent,
  type Ref,
  useEffect,
} from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  ArrowRight01Icon,
  Tick02Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  Cancel01Icon,
  Comment01Icon,
  Download01Icon,
  EraserIcon,
  GeometricShapes01Icon,
  Layers01Icon,
  PenTool03Icon,
  QuillWrite02Icon,
  Redo02Icon,
  Resize01Icon,
  TextIcon,
  Undo02Icon,
  Add01Icon,
  ArrowTurnBackwardIcon,
  Image01Icon,
  ChartLineData01Icon,
  Delete01Icon,
  ArrowDown02Icon,
  Mic01Icon,
  MicOff01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useAui,
  useAuiEvent,
  useAuiState,
  type CompleteAttachment,
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SimpleImageAttachmentAdapter,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorRoot,
  ModelSelectorSearch,
  ModelSelectorTrigger,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector";
import { Tabs } from "@base-ui/react/tabs";
import { ImageGallery } from "@/components/assistant-ui/elements/image-gallery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  AssistantChatTransport,
  getThreadMessageTokenUsage,
  useChatRuntime,
} from "@assistant-ui/ai-sdk";
import { Image } from "@/components/assistant-ui/elements/image";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import {
  ChatHeader,
  ChatList,
  ChatSidebar,
  SidebarUser,
  SidebarUserItem,
  SidebarUserSeparator,
} from "@/app/(blocks)/blocks/demos/chat-sidebar";
import data from "./data.json";

/** A model the picker lists: its `provider/id`, name, and provider. */
type ImageModel = { id: string; name: string; provider: string };

/* The transport's request hook and the messages it sees, read from the transport this block uses. */
type PrepareSendMessagesRequest = NonNullable<
  NonNullable<
    ConstructorParameters<typeof AssistantChatTransport>[0]
  >["prepareSendMessagesRequest"]
>;
type UIMessage = Parameters<PrepareSendMessagesRequest>[0]["messages"][number];

/* -------------------------------------------------------------------------- */
/* The pieces every part of the block draws with                              */
/* -------------------------------------------------------------------------- */

function Icon({
  icon,
  className,
}: {
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.75}
      aria-hidden
      {...(className ? { className } : {})}
    />
  );
}

function Tip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

/* A small outline in the shape of the orientation it stands for. */
function RatioGlyph({ shape }: { shape: string }) {
  const [width, height] = shape.split(" / ").map(Number);
  const wide = (width ?? 1) >= (height ?? 1);

  return (
    <span aria-hidden className="flex size-3.5 items-center justify-center">
      <span
        style={{ aspectRatio: shape }}
        className={cn(
          "rounded-[3px] border-[1.5px] border-current",
          wide ? "w-full" : "h-full",
        )}
      />
    </span>
  );
}

const focusRing =
  "outline-hidden focus-visible:ring-1 focus-visible:ring-foreground/20";

/*
 * One scale for the whole block.
 * Corners: 14px for a surface on the page, 10px for anything inside one, and
 * a full pill for buttons. The message box alone is rounder, at 24px.
 * List rows and text buttons are 32px tall; icon buttons are 28px.
 */
const rSurface = "rounded-(--radius)";
const rItem = "rounded-[calc(var(--radius)-4px)]";

const iconButton = `text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-3.5 ${focusRing}`;

/* A control that is only its words, 28px tall. */
const textButton = `hover:bg-foreground/[0.06] data-popup-open:bg-foreground/[0.06] flex h-7 items-center gap-1 rounded-full px-2.5 text-sm leading-5 transition-colors motion-reduce:transition-none ${focusRing}`;

/* The filled button: one to a surface, for the thing it is there to do. */
const inkButton = `bg-foreground text-background flex items-center justify-center rounded-full font-medium transition-[opacity,scale] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none ${focusRing}`;

/* A filled area with no border. */
const field = "bg-foreground/4 dark:bg-foreground/6";

/* -------------------------------------------------------------------------- */
/* Menus: a solid popup, since it opens over pictures, with 28px rows         */
/* -------------------------------------------------------------------------- */

const menu =
  "bg-popover text-popover-foreground border-border/60 z-50 flex min-w-40 origin-(--transform-origin) flex-col rounded-(--radius) border p-1 text-[0.8125rem] leading-[1.125rem] shadow-(--float-shadow) outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none";

const menuItem =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex min-h-7 shrink-0 items-center gap-2 rounded-[calc(var(--radius)-4px)] px-2 py-1 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:min-h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";

const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;
const MenuRadioGroup = MenuPrimitive.RadioGroup;

function MenuPopup({
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "side" | "align" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup className={cn(menu, className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item className={cn(menuItem, className)} {...props} />;
}

/** One of a set of choices: the chosen one carries a check at its end. */
function MenuChoice({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      closeOnClick
      className={cn(menuItem, className)}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator className="ms-auto ps-3">
        <Icon icon={Tick02Icon} />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

const MenuSub = MenuPrimitive.SubmenuRoot;

/** A row that opens a menu beside it, with what is chosen there at its end. */
function MenuSubTrigger({
  value,
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & { value: string }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(menuItem, "data-popup-open:bg-accent", className)}
      {...props}
    >
      {children}
      <span className="text-muted-foreground ms-auto ps-6">{value}</span>
      <Icon
        icon={ArrowRight01Icon}
        className="text-muted-foreground -me-1 rtl:rotate-180"
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function MenuLabel(props: ComponentProps<"p">) {
  return <p className="text-muted-foreground px-2 py-1" {...props} />;
}

function MenuSeparator() {
  return (
    <MenuPrimitive.Separator className="bg-border mx-2 my-1 h-px shrink-0" />
  );
}

/* -------------------------------------------------------------------------- */
/* What the block offers: its templates, and the settings of a picture        */
/* -------------------------------------------------------------------------- */

type Template = (typeof data.templates)[number];

/** The model a visit starts on, as `provider/id`; the route knows only this provider. */
const PROVIDER = "openai";
const MODEL = `${PROVIDER}/${data.model}`;
const TEMPLATES: readonly Template[] = data.templates;

/** Where a template's tile picture is served from. */
const tileSrc = (id: string) => `/blocks/images/${id}.webp`;

type Choice = {
  value: string;
  label: string;
  note?: string;
  /** The outline drawn beside an orientation. */
  shape?: string;
};

type SettingKey =
  | "orientation"
  | "size"
  | "quality"
  | "complexity"
  | "count"
  | "format"
  | "background"
  | "moderation"
  | "partials";

type Setting = {
  key: SettingKey;
  label: string;
  choices: readonly Choice[];
};

type Settings = Record<SettingKey, string>;

const ORIENTATIONS: readonly Choice[] = [
  { value: "auto", label: "Auto", shape: "1 / 1" },
  { value: "1:1", label: "Square", note: "1:1", shape: "1 / 1" },
  { value: "2:3", label: "Portrait", note: "2:3", shape: "2 / 3" },
  { value: "3:2", label: "Landscape", note: "3:2", shape: "3 / 2" },
  { value: "16:9", label: "Wide", note: "16:9", shape: "16 / 9" },
  { value: "9:16", label: "Tall", note: "9:16", shape: "9 / 16" },
];

/* What the plus menu sets, in its order. */
const SETTINGS: readonly Setting[] = [
  { key: "orientation", label: "Orientation", choices: ORIENTATIONS },
  {
    key: "size",
    label: "Size",
    choices: [
      { value: "standard", label: "Standard", note: "Up to 1536 px" },
      { value: "large", label: "Large", note: "Up to 2560 px" },
    ],
  },
  {
    key: "quality",
    label: "Quality",
    choices: [
      { value: "low", label: "Low", note: "Fastest" },
      { value: "medium", label: "Medium", note: "Balanced" },
      { value: "high", label: "High", note: "Most detail" },
    ],
  },
  {
    key: "complexity",
    label: "Complexity",
    choices: [
      { value: "auto", label: "Auto" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
  {
    key: "count",
    label: "Images",
    choices: [
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
    ],
  },
  {
    key: "format",
    label: "Output",
    choices: [
      { value: "webp", label: "WebP" },
      { value: "png", label: "PNG" },
      { value: "jpeg", label: "JPEG" },
    ],
  },
  {
    key: "background",
    label: "Background",
    choices: [
      { value: "auto", label: "Auto" },
      { value: "opaque", label: "Opaque" },
      { value: "transparent", label: "Transparent" },
    ],
  },
  {
    key: "moderation",
    label: "Moderation",
    choices: [
      { value: "auto", label: "Auto" },
      { value: "low", label: "Low", note: "Less strict" },
    ],
  },
  {
    key: "partials",
    label: "Partial images",
    choices: [
      { value: "0", label: "Off" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
    ],
  },
];

const DEFAULTS: Settings = {
  orientation: "auto",
  size: "standard",
  quality: "medium",
  complexity: "auto",
  count: "1",
  format: "webp",
  background: "auto",
  moderation: "auto",
  partials: "0",
};

const shapeOf = (orientation: string) =>
  ORIENTATIONS.find((entry) => entry.value === orientation)?.shape ?? "1 / 1";

/* -------------------------------------------------------------------------- */
/* The choices the next picture is made with                                  */
/* -------------------------------------------------------------------------- */

type Options = {
  model: string;
  setModel: (model: string) => void;
  settings: Settings;
  setSetting: (key: SettingKey, value: string) => void;
  resetSettings: () => void;
  /** What rides along with a request as its run config, for the route to read. */
  runConfig: { custom: Settings & { model: string } };
  /** The message box, which a chosen prompt hands the focus to. */
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

const OptionsContext = createContext<Options | null>(null);

function OptionsProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState(MODEL);
  const [settings, setSettings] = useState(DEFAULTS);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const options = useMemo<Options>(
    () => ({
      model,
      setModel,
      settings,
      setSetting: (key, value) =>
        setSettings((previous) => {
          const next = { ...previous, [key]: value };
          // A JPEG has no transparency to keep.
          if (next.format === "jpeg" && next.background === "transparent")
            next.background = "auto";
          return next;
        }),
      resetSettings: () => setSettings(DEFAULTS),
      runConfig: { custom: { ...settings, model } },
      inputRef,
    }),
    [model, settings],
  );

  return (
    <OptionsContext.Provider value={options}>
      {children}
    </OptionsContext.Provider>
  );
}

function useOptions() {
  const options = useContext(OptionsContext);
  if (!options)
    throw new Error("useOptions must be used within <OptionsProvider>.");
  return options;
}

/* -------------------------------------------------------------------------- */
/* The pictures made on this visit, across every chat. Nothing is saved.      */
/* -------------------------------------------------------------------------- */

type Made = {
  /** The id of the reply the picture came in. */
  id: string;
  src: string;
  prompt: string;
  /** The image tokens the model reported for it. */
  tokens: number;
};

let made: readonly Made[] = [];
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

function addMade(entry: Made) {
  if (made.some((item) => item.id === entry.id)) return;
  made = [entry, ...made];
  emit();
}

function clearMade() {
  made = [];
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const none: readonly Made[] = [];

function useMade() {
  return useSyncExternalStore(
    subscribe,
    () => made,
    () => none,
  );
}

const isPicture = (part: UIMessage["parts"][number]) =>
  part.type === "file" && part.mediaType.startsWith("image/");

/*
 * The route needs the newest request and the newest picture, which a
 * follow-up changes. Earlier pictures stay in the page, so a long chat does
 * not send every one of them again.
 */
function newest(messages: readonly UIMessage[]) {
  const asked = messages.findLast((message) => message.role === "user");
  const pictured = messages.findLast(
    (message) => message.role === "assistant" && message.parts.some(isPicture),
  );
  return [
    ...(pictured
      ? [{ ...pictured, parts: pictured.parts.filter(isPicture).slice(-1) }]
      : []),
    ...(asked ? [asked] : []),
  ];
}

const isEdit = (metadata: unknown) => {
  const custom = (metadata as { custom?: { edit?: unknown } } | undefined)
    ?.custom;
  return typeof custom?.edit === "string";
};

/**
 * Builds each request's body. A change sent from the editor carries settings
 * of its own (the kind of change, one picture, its shape or background), so
 * making it again sends those settings and not what the menu holds now.
 */
function createRequestBody(): PrepareSendMessagesRequest {
  const edits = new Map<string, unknown>();
  return (options) => {
    const askedId = options.messages.findLast(
      (message) => message.role === "user",
    )?.id;
    let metadata = options.requestMetadata;
    if (askedId && options.trigger === "submit-message" && isEdit(metadata))
      edits.set(askedId, metadata);
    if (askedId && options.trigger === "regenerate-message")
      metadata = edits.get(askedId) ?? metadata;

    return {
      body: {
        ...options.body,
        id: options.id,
        messages: newest(options.messages),
        trigger: options.trigger,
        messageId: options.messageId,
        metadata,
      },
    };
  };
}

/* -------------------------------------------------------------------------- */
/* What is drawn over a picture, in the picture's own pixels                  */
/* -------------------------------------------------------------------------- */

type Point = { x: number; y: number };

type Shape = "line" | "arrow" | "rect" | "ellipse";

type Mark =
  | { kind: "path"; points: readonly Point[]; color: string; width: number }
  | { kind: Shape; from: Point; to: Point; color: string; width: number }
  | { kind: "text"; at: Point; text: string; color: string; size: number }
  | { kind: "pin"; at: Point; number: number; size: number };

/** What a press on the picture does. */
type Tool = "pen" | Shape | "text" | "pin" | "eraser" | "none";

type Size = { width: number; height: number };

type SurfaceHandle = {
  /** The marks as SVG, for `rasterize`. */
  markup: () => string;
};

const pointsOf = (points: readonly Point[]) =>
  points.map((point) => `${point.x},${point.y}`).join(" ");

/* The two barbs of an arrow's head, drawn back from its tip. */
function barbs(from: Point, to: Point, width: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = width * 4;
  return [angle + Math.PI * 0.82, angle - Math.PI * 0.82].map((turn) => ({
    x: to.x + Math.cos(turn) * length,
    y: to.y + Math.sin(turn) * length,
  }));
}

function MarkShape({ mark }: { mark: Mark }) {
  if (mark.kind === "text")
    return (
      <text
        x={mark.at.x}
        y={mark.at.y}
        fill={mark.color}
        fontSize={mark.size}
        fontFamily="sans-serif"
        fontWeight={600}
        dominantBaseline="middle"
      >
        {mark.text}
      </text>
    );

  if (mark.kind === "pin")
    return (
      <g>
        <circle
          cx={mark.at.x}
          cy={mark.at.y}
          r={mark.size}
          fill="#2563eb"
          stroke="#ffffff"
          strokeWidth={mark.size / 8}
        />
        <text
          x={mark.at.x}
          y={mark.at.y}
          fill="#ffffff"
          fontSize={mark.size * 1.1}
          fontFamily="sans-serif"
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {mark.number}
        </text>
      </g>
    );

  const stroke = {
    fill: "none",
    stroke: mark.color,
    strokeWidth: mark.width,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  if (mark.kind === "path") {
    // A press with no drag is a dot.
    const [first] = mark.points;
    const points =
      mark.points.length === 1 && first ? [first, first] : mark.points;
    return <polyline points={pointsOf(points)} {...stroke} />;
  }

  const { from, to } = mark;
  if (mark.kind === "rect")
    return (
      <rect
        x={Math.min(from.x, to.x)}
        y={Math.min(from.y, to.y)}
        width={Math.abs(to.x - from.x)}
        height={Math.abs(to.y - from.y)}
        {...stroke}
      />
    );
  if (mark.kind === "ellipse")
    return (
      <ellipse
        cx={(from.x + to.x) / 2}
        cy={(from.y + to.y) / 2}
        rx={Math.abs(to.x - from.x) / 2}
        ry={Math.abs(to.y - from.y) / 2}
        {...stroke}
      />
    );

  const [left, right] = barbs(from, to, mark.width);
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} {...stroke} />
      {mark.kind === "arrow" && left && right && (
        <polyline points={pointsOf([left, to, right])} {...stroke} />
      )}
    </g>
  );
}

/*
 * The layer over the picture that takes the pointer. It draws in the
 * picture's pixels whatever size the picture is shown at, so what is sent to
 * the model lines up with it.
 */
function Surface({
  ref,
  size,
  marks,
  tool,
  color,
  width,
  onAdd,
  onRemove,
  onPoint,
  className,
}: {
  ref: Ref<SurfaceHandle>;
  size: Size;
  marks: readonly Mark[];
  tool: Tool;
  color: string;
  width: number;
  onAdd: (mark: Mark) => void;
  onRemove: (index: number) => void;
  /** A press with the text or pin tool, which the editor answers with a field. */
  onPoint: (point: Point) => void;
  className?: string;
}) {
  const marksRef = useRef<SVGGElement>(null);
  const [draft, setDraft] = useState<Mark | null>(null);

  useImperativeHandle(ref, () => ({
    // HTML writes a non-breaking space as `&nbsp;`, which an SVG image, being XML, cannot read.
    markup: () =>
      (marksRef.current?.innerHTML ?? "").replaceAll("&nbsp;", "&#160;"),
  }));

  const pointOf = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * size.width,
      y: ((event.clientY - box.top) / box.height) * size.height,
    };
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || tool === "none" || tool === "eraser") return;
    const point = pointOf(event);
    if (tool === "text" || tool === "pin") return onPoint(point);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft(
      tool === "pen"
        ? { kind: "path", points: [point], color, width }
        : { kind: tool, from: point, to: point, color, width },
    );
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!draft) return;
    const point = pointOf(event);
    setDraft(
      draft.kind === "path"
        ? { ...draft, points: [...draft.points, point] }
        : draft.kind === "text" || draft.kind === "pin"
          ? draft
          : { ...draft, to: point },
    );
  };

  const finish = () => {
    if (draft) onAdd(draft);
    setDraft(null);
  };

  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      // A press here leaves the focus where it is, so a field the press opens keeps it.
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={() => setDraft(null)}
      className={cn(
        "absolute inset-0 size-full touch-none select-none",
        tool === "none"
          ? "pointer-events-none"
          : tool === "eraser"
            ? "cursor-pointer"
            : tool === "text"
              ? "cursor-text"
              : "cursor-crosshair",
        className,
      )}
    >
      <g ref={marksRef}>
        {marks.map((mark, index) => (
          <g
            // Marks are only added at the end or removed, so a mark keeps its place.
            key={index}
            {...(tool === "eraser" && {
              onPointerDown: () => onRemove(index),
            })}
          >
            <MarkShape mark={mark} />
          </g>
        ))}
      </g>
      {draft && <MarkShape mark={draft} />}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Turning marks into the picture the model is sent                           */
/* -------------------------------------------------------------------------- */

/**
 * A PNG the size of the picture. As a drawing it holds the marks on a clear
 * background; as a mask it is solid except where the marks are, which is the
 * area the model may change.
 */
async function rasterize(markup: string, size: Size, mask = false) {
  const { width, height } = size;
  const body = mask
    ? `<mask id="kept"><rect width="100%" height="100%" fill="#fff"/>${markup}</mask><rect width="100%" height="100%" mask="url(#kept)"/>`
    : markup;
  const image = new window.Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/* -------------------------------------------------------------------------- */
/* The picture being edited, and the panel beside the chat that holds it      */
/* -------------------------------------------------------------------------- */

type Picture = { src: string; prompt: string };

type Editing = {
  open: (picture: Picture) => void;
  close: () => void;
};

const EditorContext = createContext<Editing | null>(null);

function useEditor() {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("useEditor must be used within <EditorFrame>.");
  return editor;
}

/*
 * The chat, with the editor on its right once a picture is opened in it. The
 * two share the width and the line between them drags. A phone has room for
 * one, so the editor covers the chat.
 */
function EditorFrame({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const chat = useAuiState((s) => s.threads.mainThreadId);
  // Each picture opened gets a number, so the editor starts afresh for it.
  const [opened, setOpened] = useState<{
    picture: Picture;
    chat: string;
    turn: number;
  } | null>(null);
  // A picture belongs to its chat, so the editor closes when another chat is shown.
  const shown = opened?.chat === chat ? opened : null;

  const editing = useMemo<Editing>(
    () => ({
      open: (picture) =>
        setOpened((previous) => ({
          picture,
          chat,
          turn: (previous?.turn ?? 0) + 1,
        })),
      close: () => setOpened(null),
    }),
    [chat],
  );

  const editor = shown && <Editor key={shown.turn} picture={shown.picture} />;

  return (
    <EditorContext.Provider value={editing}>
      {isMobile ? (
        <>
          <div className="contents" inert={Boolean(editor)}>
            {children}
          </div>
          {editor && <EditorSheet>{editor}</EditorSheet>}
        </>
      ) : (
        <ResizablePanelGroup className="min-h-0 flex-1">
          <ResizablePanel
            id="chat"
            minSize="20rem"
            className="flex min-w-0 flex-col"
          >
            {children}
          </ResizablePanel>
          {editor && (
            <>
              <ResizableHandle />
              <ResizablePanel
                id="editor"
                defaultSize="58%"
                minSize="22rem"
                className="flex min-w-0 flex-col"
              >
                {editor}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}
    </EditorContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* The editor: the picture, what is drawn on it, and the tools                */
/* -------------------------------------------------------------------------- */

type Mode = "markup" | "comment" | "erase";

const COLORS = [
  { value: "#e11d48", label: "Red" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#16a34a", label: "Green" },
  { value: "#2563eb", label: "Blue" },
  { value: "#111111", label: "Black" },
  { value: "#ffffff", label: "White" },
] as const;

const SHAPES: readonly { value: Shape; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "arrow", label: "Arrow" },
  { value: "rect", label: "Rectangle" },
  { value: "ellipse", label: "Ellipse" },
];

const ZOOMS = [0.25, 0.5, 1, 1.5, 2];

/*
 * The words sent with a drawing or a brushed area. The model reads them as a
 * description of the finished picture, so an erase says what is left there.
 */
const requestFor = (mode: "markup" | "erase", words: string) =>
  mode === "markup"
    ? words || "Apply the changes drawn on the picture."
    : `The same picture with ${
        words
          ? `this in the masked area: ${words}.`
          : "the object in the masked area gone, showing only the plain background where it stood."
      } Everything else stays exactly as it is.`;

const mimeOf = (src: string) => src.slice(5, src.indexOf(";"));

const attached = (src: string, name: string): CompleteAttachment => ({
  id: crypto.randomUUID(),
  type: "image",
  name,
  contentType: mimeOf(src),
  status: { type: "complete" },
  content: [{ type: "image", image: src }],
});

/* A control on the dark bar that floats over the foot of the picture. */
const barButton =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 outline-hidden transition-colors hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-white/15 data-popup-open:bg-white/15 motion-reduce:transition-none [&_svg]:size-4";

const barField =
  "h-8 min-w-0 flex-1 rounded-[10px] bg-white/10 px-2.5 text-white outline-hidden placeholder:text-white/50 focus-visible:ring-1 focus-visible:ring-white/60";

const barSend =
  "flex h-8 shrink-0 items-center gap-1 rounded-[10px] bg-white px-3 font-medium text-neutral-900 outline-hidden transition-opacity focus-visible:ring-1 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";

/* On a phone the editor covers the chat: it takes the focus when it opens and gives it back when it closes. */
function EditorSheet({ children }: { children: ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement;
    sheet.current?.focus();
    return () => {
      if (before instanceof HTMLElement) before.focus();
    };
  }, []);

  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label="Edit the picture"
      tabIndex={-1}
      className="bg-background fixed inset-0 z-40 flex flex-col outline-none"
    >
      {children}
    </div>
  );
}

function Editor({ picture }: { picture: Picture }) {
  const aui = useAui();
  const { open, close } = useEditor();
  const { runConfig, settings } = useOptions();
  const running = useAuiState((s) => s.thread.isRunning);
  const surface = useRef<SurfaceHandle>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const sent = useRef(false);
  // Set while the drawing is turned into a picture, so a second press does not send it twice.
  const drawing = useRef(false);

  const [size, setSize] = useState<Size | null>(null);
  const [room, setRoom] = useState<Size | null>(null);
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [mode, setMode] = useState<Mode | null>(null);
  const [tool, setTool] = useState<Tool>("none");
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [thickness, setThickness] = useState(3);
  const [marks, setMarks] = useState<readonly Mark[]>([]);
  const [undone, setUndone] = useState<readonly Mark[]>([]);
  // The note of each pin, in the order the pins were placed.
  const [notes, setNotes] = useState<readonly string[]>([]);
  const [undoneNotes, setUndoneNotes] = useState<readonly string[]>([]);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<{ at: Point; text: string } | null>(
    null,
  );
  const [request, setRequest] = useState("");

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRoom(entry.contentRect);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The picture a change comes back as takes the place of the one it was made from.
  useAuiEvent("thread.runEnd", () => {
    if (!sent.current) return;
    sent.current = false;
    const reply = aui.thread.getState().messages.at(-1);
    if (reply?.role !== "assistant") return;
    const made = reply.content.findLast(
      (part) => part.type === "file" && part.mimeType.startsWith("image/"),
    );
    if (made?.type === "file") open({ src: made.data, prompt: picture.prompt });
  });

  // Marks are sized against the picture, so they look the same on a small one and a large one.
  const unit = size ? Math.max(size.width, size.height) / 1024 : 1;
  const fit =
    size && room
      ? Math.min(room.width / size.width, room.height / size.height, 1)
      : 1;
  const scale = zoom === "fit" ? fit : zoom;
  const busy = running || !size;

  const enter = (next: Mode | null) => {
    setMode(next);
    setTool(next === "comment" ? "pin" : next ? "pen" : "none");
    setMarks([]);
    setUndone([]);
    setNotes([]);
    setUndoneNotes([]);
    setTyping(null);
    setRequest("");
  };

  const add = (mark: Mark) => {
    setMarks((previous) => [...previous, mark]);
    setUndone([]);
    setUndoneNotes([]);
  };

  const undo = () => {
    const last = marks.at(-1);
    if (!last) return;
    setMarks(marks.slice(0, -1));
    setUndone([...undone, last]);
    if (last.kind === "pin") {
      setNotes(notes.slice(0, -1));
      setUndoneNotes([...undoneNotes, notes.at(-1) ?? ""]);
    }
  };

  const redo = () => {
    const last = undone.at(-1);
    if (!last) return;
    setUndone(undone.slice(0, -1));
    setMarks([...marks, last]);
    if (last.kind === "pin") {
      setNotes([...notes, undoneNotes.at(-1) ?? ""]);
      setUndoneNotes(undoneNotes.slice(0, -1));
    }
  };

  const commitText = () => {
    if (typing?.text.trim())
      add({
        kind: "text",
        at: typing.at,
        text: typing.text.trim(),
        color,
        size: unit * 44,
      });
    setTyping(null);
  };

  /* A change goes to the chat as a message of its own: the words, the picture, and what was drawn on it. */
  const send = (
    text: string,
    edit: "plain" | "markup" | "mask",
    overlay?: string,
    changes: Partial<Settings> = {},
  ) => {
    sent.current = true;
    aui.thread().append({
      role: "user",
      content: [{ type: "text", text }],
      attachments: [
        attached(picture.src, "Picture"),
        ...(overlay
          ? [attached(overlay, edit === "mask" ? "Brushed area" : "Drawing")]
          : []),
      ],
      runConfig: {
        custom: { ...runConfig.custom, ...changes, count: "1", edit },
      },
    });
    enter(null);
  };

  const sendDrawn = async () => {
    if (!size || !mode || drawing.current) return;
    drawing.current = true;
    setSending(true);
    const overlay = await rasterize(
      surface.current?.markup() ?? "",
      size,
      mode === "erase",
    ).finally(() => {
      drawing.current = false;
      setSending(false);
    });
    if (mode === "comment")
      return send(
        `Apply each numbered note at its marker on the picture:\n${notes
          .map((note, index) => `${index + 1}. ${note.trim()}`)
          .join("\n")}`,
        "markup",
        overlay,
      );
    send(
      requestFor(mode, request.trim()),
      mode === "erase" ? "mask" : "markup",
      overlay,
    );
  };

  const canSend =
    !sending &&
    marks.length > 0 &&
    (mode !== "comment" || notes.every((note) => note.trim()));

  const percent = (point: Point) =>
    size
      ? {
          left: `${(point.x / size.width) * 100}%`,
          top: `${(point.y / size.height) * 100}%`,
        }
      : {};

  return (
    <section
      aria-label="Edit the picture"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !mode) return;
        event.stopPropagation();
        if (typing) setTyping(null);
        else enter(null);
      }}
      className="bg-muted/50 @container relative flex min-h-0 flex-1 flex-col text-sm"
    >
      <header className="flex h-12 shrink-0 items-center gap-1 px-3">
        <Menu>
          <MenuTrigger className={cn(textButton, "h-8")}>
            Image
            <Icon icon={ArrowDown01Icon} className="size-3.5" />
          </MenuTrigger>
          <MenuPopup className="w-64">
            <MenuLabel>Prompt</MenuLabel>
            <p className="line-clamp-6 px-2 pb-1.5 leading-[1.125rem]">
              {picture.prompt || "No prompt"}
            </p>
            <MenuSeparator />
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 px-2 py-1.5">
              <dt className="text-muted-foreground">Size</dt>
              <dd className="text-end tabular-nums">
                {size ? `${size.width} × ${size.height}` : "…"}
              </dd>
              <dt className="text-muted-foreground">Format</dt>
              <dd className="text-end uppercase">
                {mimeOf(picture.src).replace("image/", "")}
              </dd>
            </dl>
          </MenuPopup>
        </Menu>
        <Menu>
          <MenuTrigger className={cn(textButton, "ms-auto h-8 tabular-nums")}>
            {Math.round(scale * 100)}%
            <Icon icon={ArrowDown01Icon} className="size-3.5" />
          </MenuTrigger>
          <MenuPopup align="end">
            <MenuRadioGroup
              value={String(zoom)}
              onValueChange={(next: string) =>
                setZoom(next === "fit" ? "fit" : Number(next))
              }
            >
              {ZOOMS.map((level) => (
                <MenuChoice key={level} value={String(level)}>
                  {level * 100}%
                </MenuChoice>
              ))}
              <MenuSeparator />
              <MenuChoice value="fit">Zoom to fit</MenuChoice>
            </MenuRadioGroup>
          </MenuPopup>
        </Menu>
        <Tip label="Download">
          <a
            href={picture.src}
            download={`picture.${mimeOf(picture.src).replace("image/", "")}`}
            className={iconButton}
          >
            <Icon icon={Download01Icon} />
          </a>
        </Tip>
        <Tip label="Close the editor">
          <button type="button" onClick={close} className={iconButton}>
            <Icon icon={Cancel01Icon} />
          </button>
        </Tip>
      </header>

      <div ref={viewport} className="min-h-0 flex-1 overflow-auto p-4 pb-28">
        <div className="flex min-h-full min-w-full">
          <div
            // A checkerboard shows through wherever the picture is transparent.
            className="relative m-auto shrink-0 bg-[repeating-conic-gradient(--alpha(var(--foreground)/8%)_0_25%,transparent_0_50%)] bg-size-[16px_16px]"
            style={
              size
                ? { width: size.width * scale, height: size.height * scale }
                : undefined
            }
          >
            <img
              src={picture.src}
              alt={picture.prompt || "The picture being edited"}
              draggable={false}
              ref={(image) => {
                if (image?.complete && image.naturalWidth && !size)
                  setSize({
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                  });
              }}
              onLoad={(event) =>
                setSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              className={cn("block select-none", size && "size-full")}
            />
            {size && (
              <Surface
                ref={surface}
                size={size}
                marks={marks}
                tool={busy ? "none" : tool}
                color={mode === "erase" ? "#000000" : color}
                width={unit * thickness * (mode === "erase" ? 16 : 3)}
                onAdd={add}
                onRemove={(index) =>
                  setMarks(marks.filter((_, place) => place !== index))
                }
                onPoint={(point) => {
                  if (tool === "text") {
                    // Text still being typed is kept before the next is started.
                    commitText();
                    return setTyping({ at: point, text: "" });
                  }
                  add({
                    kind: "pin",
                    at: point,
                    number: marks.length + 1,
                    size: unit * 22,
                  });
                  setNotes([...notes, ""]);
                }}
                // The brushed area is sent as black, and shown as a tint.
                {...(mode === "erase" && {
                  className: "opacity-60 [&_polyline]:stroke-sky-400",
                })}
              />
            )}
            {typing && (
              <input
                autoFocus
                aria-label="Text to add"
                value={typing.text}
                onChange={(event) =>
                  setTyping({ ...typing, text: event.target.value })
                }
                onBlur={commitText}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitText();
                }}
                style={{ ...percent(typing.at), color }}
                className="absolute w-48 -translate-y-1/2 rounded-md bg-white/80 px-1.5 py-0.5 text-base font-semibold ring-1 ring-black/20 outline-hidden"
              />
            )}
            {mode === "comment" &&
              marks.map(
                (mark, index) =>
                  mark.kind === "pin" && (
                    <input
                      key={mark.number}
                      autoFocus={index === marks.length - 1}
                      aria-label={`Note ${mark.number}`}
                      placeholder="Add a note"
                      value={notes[index] ?? ""}
                      onChange={(event) =>
                        setNotes(
                          notes.map((note, place) =>
                            place === index ? event.target.value : note,
                          ),
                        )
                      }
                      style={percent(mark.at)}
                      className="bg-background text-foreground placeholder:text-muted-foreground absolute ms-5 h-8 w-44 -translate-y-1/2 rounded-full px-3 shadow-(--float-shadow) outline-hidden focus-visible:ring-1 focus-visible:ring-black/30"
                    />
                  ),
              )}
            {running && (
              <p
                role="status"
                className="bg-background/70 absolute inset-0 flex animate-pulse items-center justify-center font-medium motion-reduce:animate-none"
              >
                Making the change
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-4 z-10 flex justify-center">
        <div className="flex max-w-full flex-col gap-1 rounded-2xl bg-neutral-900 p-1 text-neutral-100 shadow-(--float-shadow) ring-1 ring-white/10">
          {mode === null && (
            <div className="flex items-center gap-0.5 overflow-x-auto">
              <BarButton
                icon={QuillWrite02Icon}
                label="Markup"
                disabled={busy}
                onClick={() => enter("markup")}
              />
              <BarButton
                icon={Comment01Icon}
                label="Comment"
                disabled={busy}
                onClick={() => enter("comment")}
              />
              <BarButton
                icon={Layers01Icon}
                label="Remove BG"
                disabled={busy}
                onClick={() =>
                  send(
                    "Remove the background, keeping the subject exactly as it is.",
                    "plain",
                    undefined,
                    {
                      background: "transparent",
                      // A JPEG has no transparency.
                      ...(settings.format === "jpeg" && { format: "png" }),
                    },
                  )
                }
              />
              <BarButton
                icon={EraserIcon}
                label="Erase"
                disabled={busy}
                onClick={() => enter("erase")}
              />
              <Menu>
                <MenuTrigger disabled={busy} className={barButton}>
                  <Icon icon={Resize01Icon} />
                  <span className="@max-md:sr-only">Resize</span>
                </MenuTrigger>
                <MenuPopup side="top" align="end" className="min-w-44">
                  {ORIENTATIONS.filter((entry) => entry.value !== "auto").map(
                    (entry) => (
                      <MenuItem
                        key={entry.value}
                        onClick={() =>
                          send(
                            `Remake this picture in a ${entry.label.toLowerCase()} ${entry.note} frame, extending the scene to fill it.`,
                            "plain",
                            undefined,
                            { orientation: entry.value },
                          )
                        }
                      >
                        {entry.shape && <RatioGlyph shape={entry.shape} />}
                        {entry.label}
                        <span className="text-muted-foreground ms-auto ps-6">
                          {entry.note}
                        </span>
                      </MenuItem>
                    ),
                  )}
                </MenuPopup>
              </Menu>
            </div>
          )}

          {mode !== null && (
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {mode === "markup" && (
                <>
                  <BarButton
                    icon={PenTool03Icon}
                    label="Pen"
                    compact
                    pressed={tool === "pen"}
                    onClick={() => setTool("pen")}
                  />
                  <BarButton
                    icon={TextIcon}
                    label="Text"
                    compact
                    pressed={tool === "text"}
                    onClick={() => setTool("text")}
                  />
                  <Menu>
                    <Tip label="Shapes" side="top">
                      <MenuTrigger
                        aria-pressed={SHAPES.some(
                          (shape) => shape.value === tool,
                        )}
                        className={barButton}
                      >
                        <Icon icon={GeometricShapes01Icon} />
                      </MenuTrigger>
                    </Tip>
                    <MenuPopup side="top">
                      <MenuRadioGroup
                        value={tool}
                        onValueChange={(next: Shape) => setTool(next)}
                      >
                        {SHAPES.map((shape) => (
                          <MenuChoice key={shape.value} value={shape.value}>
                            {shape.label}
                          </MenuChoice>
                        ))}
                      </MenuRadioGroup>
                    </MenuPopup>
                  </Menu>
                  <Menu>
                    <Tip label="Colour" side="top">
                      <MenuTrigger className={barButton}>
                        <Swatch color={color} />
                      </MenuTrigger>
                    </Tip>
                    <MenuPopup side="top">
                      <MenuRadioGroup value={color} onValueChange={setColor}>
                        {COLORS.map((entry) => (
                          <MenuChoice key={entry.value} value={entry.value}>
                            <Swatch color={entry.value} />
                            {entry.label}
                          </MenuChoice>
                        ))}
                      </MenuRadioGroup>
                    </MenuPopup>
                  </Menu>
                  <BarButton
                    icon={EraserIcon}
                    label="Remove a mark"
                    compact
                    pressed={tool === "eraser"}
                    onClick={() => setTool("eraser")}
                  />
                </>
              )}
              {mode === "comment" ? (
                <p className="px-2.5 text-white/70">
                  Click the picture to add a note
                </p>
              ) : (
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={thickness}
                  onChange={(event) => setThickness(Number(event.target.value))}
                  aria-label={mode === "erase" ? "Brush size" : "Line width"}
                  className="mx-2 w-20 shrink-0 accent-white"
                />
              )}
              <BarButton
                icon={Undo02Icon}
                label="Undo"
                compact
                disabled={marks.length === 0}
                onClick={undo}
              />
              <BarButton
                icon={Redo02Icon}
                label="Redo"
                compact
                disabled={undone.length === 0}
                onClick={redo}
              />
              {mode === "comment" && (
                <SendButton disabled={!canSend} onClick={sendDrawn} />
              )}
              <BarButton
                icon={Cancel01Icon}
                label="Cancel"
                compact
                className="ms-auto"
                onClick={() => enter(null)}
              />
            </div>
          )}

          {(mode === "markup" || mode === "erase") && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (canSend) void sendDrawn();
              }}
              className="flex items-center gap-1"
            >
              <input
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                aria-label="What to change"
                placeholder={
                  mode === "erase"
                    ? "What goes there instead (optional)"
                    : "Say what to change (optional)"
                }
                className={cn(barField, "w-80")}
              />
              <SendButton disabled={!canSend} />
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function BarButton({
  icon,
  label,
  compact = false,
  pressed,
  className,
  ...props
}: {
  icon: IconSvgElement;
  label: string;
  /** Shows the icon alone, with the label as its tooltip. */
  compact?: boolean;
  pressed?: boolean;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      {...(pressed !== undefined && { "aria-pressed": pressed })}
      className={cn(barButton, className)}
      {...props}
    >
      <Icon icon={icon} />
      {!compact && <span className="@max-md:sr-only">{label}</span>}
    </button>
  );

  return compact ? (
    <Tip label={label} side="top">
      {button}
    </Tip>
  ) : (
    button
  );
}

function SendButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      disabled={disabled}
      onClick={onClick}
      className={cn(barSend, focusRing)}
    >
      Send
      <Icon icon={ArrowUp02Icon} className="size-3.5" />
    </button>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color }}
      className="size-3.5 shrink-0 rounded-full ring-1 ring-black/15 ring-inset"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* The plus menu: pictures to start from, then the settings of the next one   */
/* -------------------------------------------------------------------------- */

/* The plus turns to a cross while its menu is open, and carries a dot once a setting has been changed. */
function AddMenu({ onAddImages }: { onAddImages: () => void }) {
  const { settings, resetSettings } = useOptions();
  const changed = SETTINGS.some(
    (setting) => settings[setting.key] !== DEFAULTS[setting.key],
  );

  return (
    <Menu>
      <Tip label="Add images and settings" side="top">
        <MenuTrigger className={cn(iconButton, "group relative size-9")}>
          <Icon
            icon={Add01Icon}
            className="size-5 transition-transform duration-200 ease-out group-aria-expanded:rotate-45 motion-reduce:transition-none"
          />
          {changed && (
            <span
              aria-hidden
              className="bg-foreground absolute end-1.5 top-1.5 size-1.5 rounded-full"
            />
          )}
        </MenuTrigger>
      </Tip>
      <MenuPopup side="top" className="min-w-60">
        <MenuItem onClick={onAddImages}>
          <Icon icon={Image01Icon} />
          Add images
        </MenuItem>
        <MenuSeparator />
        {SETTINGS.map((setting) => (
          <SettingRow key={setting.key} setting={setting} />
        ))}
        <MenuSeparator />
        <MenuItem disabled={!changed} onClick={resetSettings}>
          <Icon icon={ArrowTurnBackwardIcon} />
          Reset settings
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

/* One setting: its name and what is chosen, opening its choices beside it. The menu stays open so several can be set in one visit. */
function SettingRow({ setting }: { setting: Setting }) {
  const { settings, setSetting } = useOptions();
  const value = settings[setting.key];
  const chosen = setting.choices.find((choice) => choice.value === value);
  // With no orientation chosen, the model picks the size along with the shape.
  // Several pictures arrive together, so there are no partial ones to show.
  const held =
    setting.key === "size" && settings.orientation === "auto"
      ? "Auto"
      : setting.key === "partials" && settings.count !== "1"
        ? "Off"
        : undefined;

  return (
    <MenuSub>
      <MenuSubTrigger
        disabled={held !== undefined}
        value={held ?? chosen?.label ?? ""}
      >
        {setting.label}
      </MenuSubTrigger>
      <MenuPopup
        side="inline-end"
        align="start"
        sideOffset={4}
        className="min-w-44"
      >
        <MenuRadioGroup
          value={value}
          onValueChange={(next: string) => setSetting(setting.key, next)}
        >
          {setting.choices.map((choice) => (
            <MenuChoice
              key={choice.value}
              value={choice.value}
              closeOnClick={false}
              // A JPEG has no transparency.
              disabled={
                choice.value === "transparent" && settings.format === "jpeg"
              }
            >
              {choice.shape && <RatioGlyph shape={choice.shape} />}
              {choice.label}
              {choice.note && (
                <span className="text-muted-foreground">{choice.note}</span>
              )}
            </MenuChoice>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </MenuSub>
  );
}

/* -------------------------------------------------------------------------- */
/* Model picker: every image model Modelpedia lists, grouped by provider      */
/* -------------------------------------------------------------------------- */

/* The block's own model, which the picker holds until the list arrives, and alone if it does not. */
const OWN: readonly ImageModel[] = [
  { id: MODEL, name: data.model, provider: "OpenAI" },
];

let listed: Promise<readonly ImageModel[]> | undefined;

const readModels = () =>
  (listed ??= fetch("/blocks/demos/images/api/models")
    .then((response) =>
      response.ok ? response.json() : Promise.reject(response),
    )
    .then((body: { models: ImageModel[] }) =>
      body.models.some((model) => model.id === MODEL)
        ? body.models
        : [...OWN, ...body.models],
    )
    .catch(() => {
      // A later picker asks again.
      listed = undefined;
      return OWN;
    }));

function useImageModels() {
  const [models, setModels] = useState(OWN);

  useEffect(() => {
    let current = true;
    readModels().then((next) => {
      if (current) setModels(next);
    });
    return () => {
      current = false;
    };
  }, []);

  return models;
}

/* The route holds a key for one provider, so only that provider's models can be picked. */
const keyed = (model: ImageModel) => model.id.startsWith(`${PROVIDER}/`);

/* The route calls OpenAI's Images API, which runs its image models and not the chat models that also make pictures. */
const IMAGES_API = new RegExp(`^${PROVIDER}/gpt-image`);

const canRun = (model: ImageModel) => keyed(model) && IMAGES_API.test(model.id);

type Group = { provider: string; runs: boolean; models: ModelOption[] };

function ModelPicker() {
  const { model, setModel } = useOptions();
  const models = useImageModels();

  const { options, groups } = useMemo(() => {
    const byProvider = new Map<string, Group>();
    const options = models.map((entry) => {
      const runs = canRun(entry);
      const option: ModelOption = {
        id: entry.id,
        name: entry.name,
        keywords: [entry.provider],
        ...(!runs && { disabled: true }),
      };
      const group = byProvider.get(entry.provider) ?? {
        provider: entry.provider,
        runs: keyed(entry),
        models: [],
      };
      group.models.push(option);
      byProvider.set(entry.provider, group);
      return option;
    });
    const groups = [...byProvider.values()].sort(
      (a, b) =>
        Number(b.runs) - Number(a.runs) || a.provider.localeCompare(b.provider),
    );
    for (const group of groups)
      group.models.sort((a, b) => a.name.localeCompare(b.name));
    return { options, groups };
  }, [models]);

  return (
    <ModelSelectorRoot models={options} value={model} onValueChange={setModel}>
      <ModelSelectorTrigger
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground h-9 max-w-52 shrink-0 gap-1 rounded-full px-3 text-sm max-sm:ms-auto"
      />
      <ModelSelectorContent side="top" align="end" className="w-80">
        <ModelSelectorSearch placeholder="Search image models" />
        <ModelSelectorList className="max-h-80">
          <ModelSelectorEmpty />
          {groups.map((group) => (
            <ModelSelectorGroup
              key={group.provider}
              heading={
                group.runs
                  ? group.provider
                  : `${group.provider} · needs its own key`
              }
            >
              {group.models.map((option) => (
                <ModelSelectorItem key={option.id} model={option} />
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
}

/* -------------------------------------------------------------------------- */
/* Gallery: what a new chat shows until a picture is asked for                */
/* -------------------------------------------------------------------------- */

const TABS = [
  { value: "templates", label: "Templates" },
  { value: "mine", label: "My images" },
] as const;

const grid =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

function Gallery() {
  return (
    <div className="mx-auto w-full max-w-6xl pt-2">
      <h1 className="sr-only">Images</h1>
      <Tabs.Root defaultValue="templates">
        <Tabs.List className="flex gap-1 pb-4">
          {TABS.map((tab) => (
            <Tabs.Tab
              key={tab.value}
              value={tab.value}
              className={cn(
                "text-muted-foreground hover:text-foreground aria-selected:bg-foreground/[0.06] aria-selected:text-foreground flex h-8 items-center rounded-full px-3.5 transition-colors motion-reduce:transition-none",
                focusRing,
              )}
            >
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="templates" className="outline-none">
          <Templates />
        </Tabs.Panel>
        <Tabs.Panel value="mine" className="outline-none">
          <Mine />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

/* A tile: the template's picture over its own tint, with its name at the foot. */
function Templates() {
  const [open, setOpen] = useState<Template | null>(null);

  return (
    <>
      <ul className={grid}>
        {TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => setOpen(template)}
              style={{ backgroundColor: template.tint }}
              className={cn(
                "group relative block aspect-[4/5] w-full overflow-hidden",
                rSurface,
                focusRing,
              )}
            >
              <img
                src={tileSrc(template.id)}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-3.5 pt-12 pb-3 text-start text-base font-medium text-white">
                {template.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <TemplateDialog template={open} onClose={() => setOpen(null)} />
    </>
  );
}

/*
 * A template up close: its picture, its prompt, and the orientation to make
 * it in. Using it writes the prompt in the message box, to send as it is or
 * with your own details added.
 */
function TemplateDialog({
  template,
  onClose,
}: {
  template: Template | null;
  onClose: () => void;
}) {
  const aui = useAui();
  const { setSetting, inputRef } = useOptions();
  // The last template stays drawn while the dialog closes.
  const [shown, setShown] = useState<Template | null>(template);
  const [orientation, setOrientation] = useState<string>("auto");
  // Each opening starts from the template's own orientation, even when the same one opens again.
  const [opened, setOpened] = useState<Template | null>(null);
  if (template !== opened) {
    setOpened(template);
    if (template) {
      setShown(template);
      setOrientation(template.ratio);
    }
  }

  return (
    <Dialog
      open={template !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        finalFocus={inputRef}
        className="grid max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl md:grid-cols-[1.1fr_1fr]"
      >
        {shown && (
          <>
            <div
              style={{ backgroundColor: shown.tint }}
              className="flex items-center justify-center overflow-hidden max-md:max-h-64"
            >
              <img
                src={tileSrc(shown.id)}
                alt=""
                className="size-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-4 p-6">
              <DialogTitle className="text-xl font-medium">
                {shown.title}
              </DialogTitle>
              <DialogDescription className="text-foreground/80 text-sm leading-[1.375rem]">
                {shown.prompt}
              </DialogDescription>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Orientation
                </span>
                <Menu>
                  <MenuTrigger className={cn(textButton, field, "h-8 px-3")}>
                    <RatioGlyph shape={shapeOf(orientation)} />
                    {
                      ORIENTATIONS.find((entry) => entry.value === orientation)
                        ?.label
                    }
                  </MenuTrigger>
                  <MenuPopup align="end">
                    <MenuRadioGroup
                      value={orientation}
                      onValueChange={setOrientation}
                    >
                      {ORIENTATIONS.map((entry) => (
                        <MenuChoice key={entry.value} value={entry.value}>
                          {entry.shape && <RatioGlyph shape={entry.shape} />}
                          {entry.label}
                        </MenuChoice>
                      ))}
                    </MenuRadioGroup>
                  </MenuPopup>
                </Menu>
              </div>
              <button
                type="button"
                onClick={() => {
                  aui.composer.setText(shown.prompt);
                  setSetting("orientation", orientation);
                  onClose();
                }}
                className={cn(inkButton, "mt-auto h-9 px-4 text-sm")}
              >
                Use this prompt
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Every picture made on this visit, newest first, with one full-screen view to move through them. */
function Mine() {
  const made = useMade();

  if (made.length === 0)
    return (
      <p className="text-muted-foreground py-10 text-center">
        Pictures you make show up here.
      </p>
    );

  return (
    <ImageGallery
      images={made.map((picture) => ({
        id: picture.id,
        src: picture.src,
        alt: picture.prompt,
        caption: picture.prompt,
      }))}
      maxVisible={made.length}
      className="max-w-none *:gap-3 *:@2xl:grid-cols-4 *:@5xl:grid-cols-5"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* The person at the foot of the sidebar, and what they have used             */
/* -------------------------------------------------------------------------- */

const count = (value: number) => value.toLocaleString("en-US");

function User() {
  const made = useMade();
  const { model } = useOptions();
  const [usageOpen, setUsageOpen] = useState(false);

  return (
    <>
      <SidebarUser
        detail={
          made.length === 1 ? "1 picture" : `${count(made.length)} pictures`
        }
      >
        <SidebarUserItem onClick={() => setUsageOpen(true)}>
          <Icon icon={ChartLineData01Icon} />
          Usage
        </SidebarUserItem>
        <SidebarUserSeparator />
        <SidebarUserItem disabled={made.length === 0} onClick={clearMade}>
          <Icon icon={Delete01Icon} />
          Clear my images
        </SidebarUserItem>
      </SidebarUser>
      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Usage</DialogTitle>
            <DialogDescription>
              Counted for this visit. Nothing is saved.
            </DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col text-sm">
            <Row label="Pictures made" value={count(made.length)} />
            <Row
              label="Tokens used"
              value={count(made.reduce((sum, item) => sum + item.tokens, 0))}
            />
            <Row
              label="Model"
              value={model.slice(model.indexOf("/") + 1)}
              mono
            />
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-border/60 flex items-baseline justify-between gap-4 border-t py-2.5 first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Runtime: each chat is one picture and the changes asked of it              */
/* -------------------------------------------------------------------------- */

const subscribeNever = () => () => {};

/* Speech recognition is a browser feature, so the server answers no. */
function useCanDictate() {
  return useSyncExternalStore(
    subscribeNever,
    WebSpeechDictationAdapter.isSupported,
    () => false,
  );
}

function useDictationAdapter() {
  const supported = useCanDictate();
  return useMemo(
    () => (supported ? new WebSpeechDictationAdapter() : undefined),
    [supported],
  );
}

type Part = ThreadMessage["content"][number];

const textOf = (message: ThreadMessage | undefined) =>
  (message?.content ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();

const picturesOf = (parts: readonly Part[]) =>
  parts.flatMap((part) =>
    part.type === "file" && part.mimeType.startsWith("image/")
      ? [part.data]
      : [],
  );

const titleOf = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57).trimEnd()}...` : text;

/*
 * A chat is named after its first request, and each picture that arrives is
 * added to My images.
 */
function Bookkeeping() {
  const aui = useAui();

  useAuiEvent("thread.runEnd", () => {
    const { messages } = aui.thread.getState();
    const chat = aui.threads.item("main");
    const first = textOf(messages.find((message) => message.role === "user"));
    if (!chat.getState().title && first) chat.rename(titleOf(first));

    const reply = messages.at(-1);
    if (reply?.role !== "assistant") return;
    const prompt = textOf(messages.at(-2));
    const tokens = getThreadMessageTokenUsage(reply)?.totalTokens ?? 0;
    picturesOf(reply.content).forEach((src, index) =>
      // The reply's tokens are counted once, on its first picture.
      addMade({
        id: `${reply.id}:${index}`,
        src,
        prompt,
        tokens: index === 0 ? tokens : 0,
      }),
    );
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Frame: the shared sidebar of chats, and the one page beside it             */
/* -------------------------------------------------------------------------- */

export function Images() {
  const [transport] = useState(
    () =>
      new AssistantChatTransport({
        api: "/blocks/demos/images/api/chat",
        prepareSendMessagesRequest: createRequestBody(),
      }),
  );
  const [attachments] = useState(() => new SimpleImageAttachmentAdapter());
  const [query, setQuery] = useState("");
  const dictation = useDictationAdapter();
  const runtime = useChatRuntime({
    transport,
    adapters: { attachments, dictation },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Bookkeeping />
      <OptionsProvider>
        <ChatSidebar
          title="Images"
          history
          search={{ query, onQueryChange: setQuery, label: "Search images" }}
          defaultOpen={false}
          list={<ChatList label="New image" heading="Recent" query={query} />}
          footer={<User />}
        >
          <EditorFrame>
            <ChatHeader newLabel="New image" searchLabel="Search images" />
            <Thread />
          </EditorFrame>
        </ChatSidebar>
      </OptionsProvider>
    </AssistantRuntimeProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* The page: the gallery until a picture is asked for, then the chat          */
/* -------------------------------------------------------------------------- */

function Thread() {
  const empty = useAuiState((s) => s.thread.isEmpty);

  // The gallery scrolls on its own, from its top, with the message box floating over its foot.
  if (empty)
    return (
      <ThreadPrimitive.Root className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          <Gallery />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            <Composer />
          </div>
        </div>
      </ThreadPrimitive.Root>
    );

  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-2 pb-10">
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
        </div>
        <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col pb-4">
          <Tip label="Scroll to the newest picture">
            <ThreadPrimitive.ScrollToBottom
              className={cn(
                iconButton,
                "bg-background border-border/60 absolute -top-10 self-center border disabled:invisible",
              )}
            >
              <Icon icon={ArrowDown02Icon} />
            </ThreadPrimitive.ScrollToBottom>
          </Tip>
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <Attachment />}
        </MessagePrimitive.Attachments>
      </div>
      <div
        className={cn(
          field,
          "max-w-[80%] rounded-3xl px-4 py-2 leading-[1.375rem] wrap-break-word whitespace-pre-wrap",
        )}
      >
        <MessagePrimitive.Parts>
          {({ part }) => (part.type === "text" ? part.text : null)}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

/*
 * A reply is its pictures: one stands alone with its actions, several share
 * a grid and one full-screen view. Until the first arrives, the reply holds
 * its place in the shape that was asked for.
 */
function AssistantMessage() {
  const aui = useAui();
  const editor = useEditor();
  const { runConfig } = useOptions();
  const parts = useAuiState((s) => s.message.parts);
  const running = useAuiState((s) => s.message.status?.type === "running");
  const blocked = useAuiState(
    (s) =>
      s.message.status?.type === "incomplete" &&
      s.message.status.reason === "content-filter",
  );
  const asked = useAuiState((s) =>
    textOf(s.thread.messages[s.message.index - 1]),
  );
  const pictures = useMemo(() => picturesOf(parts), [parts]);
  const [single] = pictures;
  const preview = useMemo(() => previewOf(parts), [parts]);
  const alt = asked || "The picture that was made";
  const makeAgain = () => aui.message.reload({ runConfig });

  return (
    <MessagePrimitive.Root className="flex flex-col items-start gap-2">
      {pictures.length > 1 ? (
        <>
          <ImageGallery
            images={pictures.map((src, index) => ({
              id: String(index),
              src,
              alt: `${alt} (${index + 1} of ${pictures.length})`,
              caption: asked,
            }))}
            maxVisible={pictures.length}
            // Two or four pictures sit two to a row.
            className={cn(
              "max-w-xl",
              pictures.length !== 3 && "*:@sm:grid-cols-2",
            )}
          />
          <ActionBarPrimitive.Root hideWhenRunning className="flex gap-0.5">
            <Tip label="Make them again">
              <button type="button" className={iconButton} onClick={makeAgain}>
                <Icon icon={RefreshIcon} />
              </button>
            </Tip>
          </ActionBarPrimitive.Root>
        </>
      ) : single ? (
        <>
          <Image.Root size="lg" className={rSurface}>
            <Image.Zoom src={single} alt={alt}>
              <Image.Preview
                src={single}
                alt={alt}
                className="max-h-[60dvh] w-auto max-w-full"
              />
            </Image.Zoom>
            <button
              type="button"
              onClick={() => editor.open({ src: single, prompt: asked })}
              className={cn(
                "absolute start-3 bottom-3 flex h-8 items-center rounded-full bg-black/75 px-3.5 text-sm font-medium text-white transition-colors hover:bg-black/90 motion-reduce:transition-none",
                focusRing,
              )}
            >
              Edit
            </button>
          </Image.Root>
          <ActionBarPrimitive.Root hideWhenRunning>
            <Image.Actions
              part={{ type: "image", image: single }}
              onRegenerate={makeAgain}
              className="p-0"
            />
          </ActionBarPrimitive.Root>
        </>
      ) : running ? (
        <Pending preview={preview} />
      ) : null}
      {blocked && (
        <Image.Root size="sm" className={rSurface}>
          <Image.ContentFilterError reason="The provider blocked this request." />
        </Image.Root>
      )}
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root
          className={cn(
            rSurface,
            "border-destructive/25 text-destructive bg-destructive/5 border px-3.5 py-2.5",
          )}
        >
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

/* The newest partial picture the route has sent ahead of the finished one. */
const previewOf = (parts: readonly Part[]) => {
  const partial = parts.findLast(
    (part) => part.type === "data" && part.name === "partial",
  );
  const url: unknown = partial?.type === "data" ? partial.data?.url : undefined;
  return typeof url === "string" ? url : undefined;
};

/* The place a picture will take: a partial one as it arrives, or the shape that was asked for. */
function Pending({ preview }: { preview: string | undefined }) {
  const { settings } = useOptions();

  if (preview)
    return (
      <Image.Root size="lg" role="status" className={rSurface}>
        <Image.Preview
          src={preview}
          alt="Your picture so far"
          className="max-h-[60dvh] w-auto max-w-full animate-pulse motion-reduce:animate-none"
        />
      </Image.Root>
    );

  return (
    <Image.Root
      role="status"
      style={{ aspectRatio: shapeOf(settings.orientation) }}
      className={cn(rSurface, "max-h-[60dvh] w-80 max-w-full")}
    >
      <Image.Generating className="size-full" />
    </Image.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message box: what to make, with which model and settings                   */
/* -------------------------------------------------------------------------- */

/*
 * One row: add and settings, the words, the model, dictate, send. Pictures
 * attached as a starting point sit in a muted strip that tucks behind the box.
 */
function Composer() {
  const aui = useAui();
  const { runConfig, inputRef } = useOptions();
  const empty = useAuiState((s) => s.thread.isEmpty);
  const attached = useAuiState((s) => s.composer.attachments.length > 0);
  const addImages = useRef<HTMLButtonElement>(null);

  return (
    <ComposerPrimitive.Root
      // The model and the settings ride along with the message as its run config, which the route reads.
      onSubmit={() => aui.composer.setRunConfig(runConfig)}
      className="flex flex-col"
    >
      <div
        inert={!attached}
        className={cn(
          "grid transition-[grid-template-rows,margin] duration-200 ease-out motion-reduce:transition-none",
          attached ? "-mb-4 grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="bg-muted border-border/60 mx-4 flex [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] gap-2 overflow-x-auto rounded-t-2xl border border-b-0 px-2 pt-2 pb-6">
            <ComposerPrimitive.Attachments>
              {() => <Attachment removable />}
            </ComposerPrimitive.Attachments>
          </div>
        </div>
      </div>
      {/*
       * The picker stays here, outside the menu that opens it: the primitive
       * drops a pick made after it has unmounted, as a closed menu's has.
       */}
      <ComposerPrimitive.AddAttachment ref={addImages} hidden />
      <ComposerPrimitive.AttachmentDropzone className="bg-background/70 border-border/60 data-[dragging=true]:border-foreground/40 relative flex flex-col rounded-[1.75rem] border p-1.5 shadow-(--float-shadow) backdrop-blur-sm transition-colors motion-reduce:transition-none">
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <DictationStatus />
        </AuiIf>
        {/* A phone has no room for the words beside the controls, so they take a row of their own above. */}
        <div className="flex items-end gap-0.5 max-sm:flex-wrap">
          <AddMenu onAddImages={() => addImages.current?.click()} />
          <ComposerPrimitive.Input
            ref={inputRef}
            rows={1}
            placeholder={empty ? "Describe a new image" : "Describe a change"}
            aria-label="Describe the picture"
            className="placeholder:text-muted-foreground/70 max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-base leading-6 outline-none max-sm:order-first max-sm:basis-full max-sm:px-3"
          />
          <ModelPicker />
          <DictationButton />
          <AuiIf condition={(s) => s.thread.isRunning}>
            <Tip label="Stop" side="top">
              <ComposerPrimitive.Cancel className={cn(inkButton, "size-9")}>
                <span
                  aria-hidden
                  className="size-2.5 rounded-[2px] bg-current"
                />
              </ComposerPrimitive.Cancel>
            </Tip>
          </AuiIf>
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <Tip label="Make the picture" side="top">
              <ComposerPrimitive.Send className={cn(inkButton, "size-9")}>
                <Icon icon={ArrowUp02Icon} className="size-4.5" />
              </ComposerPrimitive.Send>
            </Tip>
          </AuiIf>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function DictationButton() {
  const canDictate = useCanDictate();
  const dictating = useAuiState((s) => s.composer.dictation != null);
  if (!canDictate) return null;

  return dictating ? (
    <Tip label="Stop dictating" side="top">
      <ComposerPrimitive.StopDictation
        className={cn(
          iconButton,
          "bg-foreground/[0.07] text-foreground size-9",
        )}
      >
        <Icon icon={MicOff01Icon} className="size-4.5" />
      </ComposerPrimitive.StopDictation>
    </Tip>
  ) : (
    <Tip label="Dictate" side="top">
      <ComposerPrimitive.Dictate
        className={cn(iconButton, "text-foreground size-9")}
      >
        <Icon icon={Mic01Icon} className="size-4.5" />
      </ComposerPrimitive.Dictate>
    </Tip>
  );
}

/* While dictating: the words being heard, or a note that it is listening. */
function DictationStatus() {
  const hearing = useAuiState((s) => Boolean(s.composer.dictation?.transcript));

  return (
    <div className="text-muted-foreground flex items-center gap-2 px-3 pt-1.5 pb-0.5">
      <span
        aria-hidden
        className="bg-destructive size-1.5 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
      />
      {hearing ? (
        <ComposerPrimitive.DictationTranscript className="min-w-0 truncate" />
      ) : (
        <span role="status">Listening</span>
      )}
    </div>
  );
}

/* An attached picture: in the message box before it is sent, and on the message after. */
function Attachment({ removable = false }: { removable?: boolean }) {
  const name = useAuiState((s) => s.attachment.name);
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root
      className={cn(
        field,
        rItem,
        "border-border/60 relative size-14 shrink-0 overflow-hidden border",
      )}
    >
      {src && <img src={src} alt={name} className="size-full object-cover" />}
      {removable && (
        <Tip label="Remove the image" side="top">
          <AttachmentPrimitive.Remove
            className={cn(
              iconButton,
              "bg-background/90 text-foreground hover:bg-background absolute end-0.5 top-0.5 size-5",
            )}
          >
            <Icon icon={Cancel01Icon} />
          </AttachmentPrimitive.Remove>
        </Tip>
      )}
    </AttachmentPrimitive.Root>
  );
}
