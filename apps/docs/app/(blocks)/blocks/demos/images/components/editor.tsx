"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useAui,
  useAuiEvent,
  useAuiState,
  type CompleteAttachment,
} from "@assistant-ui/react";
import {
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
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Surface,
  rasterize,
  type Mark,
  type Point,
  type Shape,
  type Size,
  type SurfaceHandle,
  type Tool,
} from "./canvas";
import { ORIENTATIONS, useOptions, type Settings } from "./state";
import {
  Icon,
  Menu,
  MenuChoice,
  MenuItem,
  MenuLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuSeparator,
  MenuTrigger,
  RatioGlyph,
  Tip,
  focusRing,
  iconButton,
  textButton,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* The picture being edited, and the panel beside the chat that holds it      */
/* -------------------------------------------------------------------------- */

export type Picture = { src: string; prompt: string };

type Editing = {
  open: (picture: Picture) => void;
  close: () => void;
};

const EditorContext = createContext<Editing | null>(null);

export function useEditor() {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("useEditor must be used within <EditorFrame>.");
  return editor;
}

/*
 * The chat, with the editor on its right once a picture is opened in it. The
 * two share the width and the line between them drags. A phone has room for
 * one, so the editor covers the chat.
 */
export function EditorFrame({ children }: { children: ReactNode }) {
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
          {children}
          {editor && (
            <div
              role="dialog"
              aria-label="Edit the picture"
              className="bg-background fixed inset-0 z-40 flex flex-col"
            >
              {editor}
            </div>
          )}
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

function Editor({ picture }: { picture: Picture }) {
  const aui = useAui();
  const { open, close } = useEditor();
  const { runConfig, settings } = useOptions();
  const running = useAuiState((s) => s.thread.isRunning);
  const surface = useRef<SurfaceHandle>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

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
    setTyping(null);
    setRequest("");
  };

  const add = (mark: Mark) => {
    setMarks((previous) => [...previous, mark]);
    setUndone([]);
  };

  const undo = () => {
    const last = marks.at(-1);
    if (!last) return;
    setMarks(marks.slice(0, -1));
    setUndone([...undone, last]);
    if (last.kind === "pin") setNotes(notes.slice(0, -1));
  };

  const redo = () => {
    const last = undone.at(-1);
    if (!last) return;
    setUndone(undone.slice(0, -1));
    setMarks([...marks, last]);
    if (last.kind === "pin") setNotes([...notes, ""]);
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
    if (!size || !mode) return;
    const overlay = await rasterize(
      surface.current?.markup() ?? "",
      size,
      mode === "erase",
    );
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
