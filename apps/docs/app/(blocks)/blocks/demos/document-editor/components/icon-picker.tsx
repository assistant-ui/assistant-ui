"use client";

import { Tabs } from "@base-ui/react/tabs";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type RefObject,
  type UIEvent,
} from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import {
  type PageIcon as PageIconValue,
  STORAGE_KEY,
  documentActions,
  useCurrentPage,
} from "../lib/document";
import {
  type Glyph,
  type IconName,
  Icon,
  IconButton,
  PAGE_ICONS,
  PageGlyph,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  focusBorder,
  glyphFor,
  icons,
  radius,
  text,
  textButtonClass,
  weight,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* What a page can wear: a curated set of emoji, and the block's own icons.   */
/* -------------------------------------------------------------------------- */

type Kind = PageIconValue["kind"];

type Entry = { icon: PageIconValue; label: string };

type Section = { id: string; label: string; entries: Entry[] };

/** Rows of `emoji name`, split by `|`. The name is what search matches. */
const emoji = (rows: readonly string[]): Entry[] =>
  rows
    .join("|")
    .split("|")
    .map((item): Entry => {
      const space = item.indexOf(" ");
      return {
        icon: { kind: "emoji", value: item.slice(0, space) },
        label: item.slice(space + 1),
      };
    });

const EMOJI_GROUPS: readonly (Section & { glyph: Glyph })[] = [
  {
    id: "people",
    label: "Smileys and people",
    glyph: icons.smile,
    entries: emoji([
      "😀 grinning face|😃 big smile|😄 smile|😁 beaming grin|😆 laughing|😅 nervous laugh sweat|🤣 rolling laughing|😂 tears of joy",
      "🙂 slight smile|🙃 upside down|😉 wink|😊 blush happy|😇 angel halo|🥰 in love hearts|😍 heart eyes|🤩 star struck",
      "😘 blowing kiss|😋 yum tasty|😛 tongue out|😜 wink tongue|🤪 zany silly|🤑 money face|🤗 hug|🤭 oops giggle",
      "🤫 shush quiet|🤔 thinking|🤐 zipper mouth|😐 neutral|😑 expressionless|😶 no mouth|😏 smirk|😒 unamused",
      "🤯 mind blown|🥳 party face|😎 cool sunglasses|🤓 nerd glasses|🧐 monocle curious|😕 confused|😟 worried|🙁 frown",
      "😮 surprised|😳 flushed|🥺 pleading|😢 crying|😭 sobbing|😱 scream|😤 huffing|😡 angry",
      "😈 devil|💀 skull|👻 ghost|👽 alien|🤖 robot|💩 poop|🙈 see no evil|🙊 speak no evil",
      "👋 waving hand hello|👍 thumbs up|👎 thumbs down|👏 clapping|🙌 raised hands hooray|🙏 folded hands thanks pray|🤝 handshake|💪 strong muscle",
      "✌️ peace victory|🤞 fingers crossed|👌 ok hand|👉 pointing right|👈 pointing left|👆 pointing up|👇 pointing down|✍️ writing hand",
      "👀 eyes looking|🧠 brain|👤 person|👥 people team",
    ]),
  },
  {
    id: "nature",
    label: "Animals and nature",
    glyph: glyphFor("leaf"),
    entries: emoji([
      "🐶 dog|🐱 cat|🐭 mouse|🐹 hamster|🐰 rabbit|🦊 fox|🐻 bear|🐼 panda",
      "🐨 koala|🐯 tiger|🦁 lion|🐮 cow|🐷 pig|🐸 frog|🐵 monkey|🐔 chicken",
      "🐧 penguin|🐦 bird|🦆 duck|🦉 owl|🐴 horse|🦄 unicorn|🐝 bee|🦋 butterfly",
      "🌵 cactus|🌲 evergreen tree|🌳 tree|🌴 palm tree|🌱 seedling sprout|🌿 herb|🍀 four leaf clover luck|🍁 maple leaf",
      "🌸 blossom|🌹 rose|🌻 sunflower|🌷 tulip|🌈 rainbow|☀️ sun|🌙 moon|⭐ star",
      "✨ sparkles|⚡ lightning|🔥 fire|💧 water drop|🌊 wave ocean|❄️ snowflake|☁️ cloud|🌍 earth globe",
    ]),
  },
  {
    id: "food",
    label: "Food",
    glyph: glyphFor("coffee"),
    entries: emoji([
      "🍎 apple|🍐 pear|🍊 orange|🍋 lemon|🍌 banana|🍉 watermelon|🍇 grapes|🍓 strawberry",
      "🥐 croissant|🧀 cheese|🥚 egg|🥞 pancakes|🍔 burger|🍟 fries|🍕 pizza|🌮 taco",
      "🍣 sushi|🍜 noodles ramen|🍝 pasta|🥗 salad|🍪 cookie|🎂 birthday cake|🍰 cake slice|🍩 doughnut",
      "🍫 chocolate|🍿 popcorn|☕ coffee|🍵 tea|🥤 soft drink|🍺 beer|🍷 wine|🥂 cheers toast",
    ]),
  },
  {
    id: "activities",
    label: "Activities",
    glyph: glyphFor("award"),
    entries: emoji([
      "⚽ football soccer|🏀 basketball|🏈 american football|⚾ baseball|🎾 tennis|🏐 volleyball|🏓 table tennis|⛳ golf",
      "🏊 swimming|🚴 cycling|🏃 running|🧘 yoga meditation|🎿 skiing|🏆 trophy|🥇 gold medal first|🏅 medal",
      "🎯 target bullseye|🎮 video game|🎲 dice|🧩 puzzle piece|🎨 art palette|🎬 film clapper|🎤 microphone|🎧 headphones",
      "🎵 music note|🎸 guitar|🎹 piano|🥁 drum|🎭 theatre|🎪 circus|🎉 party popper|🎊 confetti",
      "🎁 gift present|🎈 balloon",
    ]),
  },
  {
    id: "travel",
    label: "Travel",
    glyph: glyphFor("plane"),
    entries: emoji([
      "🚗 car|🚕 taxi|🚌 bus|🚓 police car|🚑 ambulance|🚒 fire engine|🚚 delivery truck|🚜 tractor",
      "🚲 bicycle|🛵 scooter|🚂 train|🚇 metro underground|✈️ plane|🚀 rocket launch|🛸 flying saucer|🚁 helicopter",
      "⛵ sailing boat|🚢 ship|⚓ anchor|🧭 compass|🧳 luggage|⛺ tent camping|🏠 house home|🏢 office building",
      "🌉 bridge|🌆 city|🌋 volcano|🗻 mountain",
    ]),
  },
  {
    id: "objects",
    label: "Objects",
    glyph: glyphFor("idea"),
    entries: emoji([
      "💡 light bulb idea|🔦 torch flashlight|📱 phone|💻 laptop|📷 camera|🎥 film camera|📺 television|⏰ alarm clock",
      "⏳ hourglass|📅 calendar|📌 pin|📎 paperclip|✂️ scissors|📏 ruler|✏️ pencil|📝 memo note",
      "📓 notebook|📕 book|📚 books|📖 open book|🔖 bookmark|📁 folder|📊 bar chart|📈 chart up growth",
      "📉 chart down|📋 clipboard|📦 package box|📫 mailbox|✉️ envelope mail|💼 briefcase|💰 money bag|💳 credit card",
      "🧾 receipt|🔑 key|🔒 lock|🔓 unlocked|🔨 hammer|🔧 wrench|⚙️ gear settings|🧰 toolbox",
      "🧪 test tube|🔬 microscope|🔭 telescope|💊 pill|🧹 broom|🛒 shopping trolley cart|🎓 graduation cap|👑 crown",
      "💎 gem diamond|🔔 bell|📣 megaphone|🔍 magnifier search|🧲 magnet",
    ]),
  },
  {
    id: "symbols",
    label: "Symbols",
    glyph: glyphFor("heart"),
    entries: emoji([
      "❤️ red heart love|🧡 orange heart|💛 yellow heart|💚 green heart|💙 blue heart|💜 purple heart|🖤 black heart|🤍 white heart",
      "💔 broken heart|💯 hundred|✅ check done|☑️ checkbox|✔️ tick|❌ cross|❗ exclamation|❓ question",
      "⚠️ warning|🚫 prohibited|⛔ no entry|💤 sleep zzz|💬 speech bubble|💭 thought bubble|♻️ recycle|➕ plus",
      "➖ minus|➡️ right arrow|⬅️ left arrow|⬆️ up arrow|⬇️ down arrow|🔄 refresh|🔴 red circle|🟠 orange circle",
      "🟡 yellow circle|🟢 green circle|🔵 blue circle|🟣 purple circle|⚫ black circle|⚪ white circle|🔶 orange diamond|🔷 blue diamond",
      "🏁 chequered flag finish|🚩 red flag|🆕 new|🆗 ok|🔝 top",
    ]),
  },
];

const EMOJI_NAMES = new Map(
  EMOJI_GROUPS.flatMap((group) =>
    group.entries.map((entry) => [entry.icon.value, entry.label] as const),
  ),
);

/** Icons from the block's own set that also suit a page. */
const MORE_ICONS: readonly { name: IconName; label: string }[] = [
  { name: "text", label: "Text" },
  { name: "bullet", label: "List" },
  { name: "numbered", label: "Numbered list" },
  { name: "quote", label: "Quote" },
  { name: "table", label: "Table" },
  { name: "link", label: "Link" },
  { name: "attach", label: "Paperclip" },
  { name: "at", label: "At sign" },
  { name: "search", label: "Search" },
  { name: "smile", label: "Smile" },
  { name: "mic", label: "Microphone" },
  { name: "history", label: "History" },
  { name: "download", label: "Download" },
  { name: "rename", label: "Pencil" },
  { name: "duplicate", label: "Copy" },
  { name: "delete", label: "Bin" },
  { name: "auto", label: "Lightning" },
  { name: "manual", label: "Pointer" },
  { name: "turnInto", label: "Repeat" },
  { name: "undo", label: "Undo" },
  { name: "tick", label: "Tick" },
  { name: "add", label: "Plus" },
  { name: "arrowRight", label: "Arrow" },
  { name: "h1", label: "Heading" },
];

const ICON_SECTION: Section = {
  id: "icons",
  label: "Icons",
  entries: [...PAGE_ICONS, ...MORE_ICONS].map(({ name, label }): Entry => ({
    icon: { kind: "icon", value: name },
    label,
  })),
};

const ICON_NAMES = new Map(
  ICON_SECTION.entries.map((entry) => [entry.icon.value, entry.label] as const),
);

const nameOf = (icon: PageIconValue) =>
  (icon.kind === "emoji" ? EMOJI_NAMES : ICON_NAMES).get(icon.value) ??
  icon.value;

const sameIcon = (a: PageIconValue, b: PageIconValue | undefined) =>
  a.kind === b?.kind && a.value === b?.value;

/* -------------------------------------------------------------------------- */
/* Recently used, kept in this browser beside the saved pages.                */
/* -------------------------------------------------------------------------- */

const RECENT_KEY = `${STORAGE_KEY}:recent-icons`;
const RECENT_KEPT = 24;

const recentSchema = z.array(
  z.object({ kind: z.enum(["emoji", "icon"]), value: z.string() }),
);

function readRecent(): PageIconValue[] {
  try {
    const saved = recentSchema.safeParse(
      JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]"),
    );
    return saved.success ? saved.data : [];
  } catch {
    return [];
  }
}

function remember(icon: PageIconValue) {
  const recent = [
    icon,
    ...readRecent().filter((item) => !sameIcon(item, icon)),
  ].slice(0, RECENT_KEPT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // A full or blocked storage only loses the recently used row.
  }
}

/* -------------------------------------------------------------------------- */
/* The grid: sections of cells eight across, walked with the arrow keys.      */
/* -------------------------------------------------------------------------- */

const COLUMNS = 8;

function sectionsOf(
  kind: Kind,
  query: string,
  recent: readonly PageIconValue[],
): Section[] {
  const groups: readonly Section[] =
    kind === "emoji" ? EMOJI_GROUPS : [ICON_SECTION];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const entries = groups
      .flatMap((group) => group.entries)
      .filter(
        (entry) =>
          entry.icon.value === query.trim() ||
          words.every((word) => entry.label.toLowerCase().includes(word)),
      );
    return entries.length > 0
      ? [{ id: "results", label: "Results", entries }]
      : [];
  }
  const names = kind === "emoji" ? EMOJI_NAMES : ICON_NAMES;
  const entries = recent
    .filter((icon) => icon.kind === kind && names.has(icon.value))
    .slice(0, COLUMNS)
    .map((icon): Entry => ({ icon, label: nameOf(icon) }));
  return entries.length > 0
    ? [{ id: "recent", label: "Recently used", entries }, ...groups]
    : [...groups];
}

/** The cells in reading order, the rows they sit in, and where each section starts. */
function gridOf(sections: readonly Section[]) {
  const entries: Entry[] = [];
  const rows: number[][] = [];
  const starts: number[] = [];
  for (const section of sections) {
    starts.push(entries.length);
    section.entries.forEach((entry, index) => {
      if (index % COLUMNS === 0) rows.push([]);
      rows.at(-1)?.push(entries.length);
      entries.push(entry);
    });
  }
  return { entries, rows, starts };
}

const STEPS: Record<string, readonly [across: number, down: number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

/** The cell an arrow key leads to: along the reading order, or to the same column of the next row. */
function stepFrom(
  rows: readonly (readonly number[])[],
  count: number,
  from: number,
  [across, down]: readonly [number, number],
) {
  if (across !== 0) return Math.max(0, Math.min(count - 1, from + across));
  const row = rows.findIndex((cells) => cells.includes(from));
  const target = rows[row + down];
  const column = rows[row]?.indexOf(from) ?? 0;
  return target?.[Math.min(column, target.length - 1)] ?? from;
}

const KINDS: readonly Kind[] = ["emoji", "icon"];

const KIND_LABELS: Record<Kind, string> = { emoji: "Emoji", icon: "Icons" };

const tabClass = cn(
  focusBorder,
  radius.sm,
  text.bodySm,
  weight.label,
  "text-muted-foreground hover:text-foreground data-active:bg-accent data-active:text-foreground flex h-7 items-center px-2.5 transition-colors duration-150 motion-reduce:transition-none pointer-coarse:h-9",
);

function IconPanel({
  value,
  searchRef,
  onChoose,
}: {
  value: PageIconValue | undefined;
  searchRef: RefObject<HTMLInputElement | null>;
  onChoose: (icon: PageIconValue | null) => void;
}) {
  const [kind, setKind] = useState<Kind>(value?.kind ?? "emoji");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [recent] = useState(readRecent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const listId = useId();

  const sections = useMemo(
    () => sectionsOf(kind, query, recent),
    [kind, query, recent],
  );
  const { entries, rows, starts } = useMemo(() => gridOf(sections), [sections]);
  const current = entries[active];
  const browsing = kind === "emoji" && query.trim() === "";
  const noun = KIND_LABELS[kind].toLowerCase();

  const restart = () => {
    setActive(0);
    setCategory(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const choose = (icon: PageIconValue) => {
    remember(icon);
    onChoose(icon);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const step = STEPS[event.key];
    if (step) {
      event.preventDefault();
      const next = stepFrom(rows, entries.length, active, step);
      setActive(next);
      document
        .getElementById(`${listId}-${next}`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && current) {
      event.preventDefault();
      choose(current.icon);
    }
  };

  // Scrolling under a still pointer raises moves too, and those must not
  // take the highlight from the arrow keys.
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const { clientX: x, clientY: y, target } = event;
    if (x === pointer.current.x && y === pointer.current.y) return;
    pointer.current = { x, y };
    const cell =
      target instanceof Element
        ? target.closest<HTMLElement>("[data-cell]")?.dataset["cell"]
        : undefined;
    if (cell !== undefined) setActive(Number(cell));
  };

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const box = event.currentTarget;
    const marks = [...box.querySelectorAll<HTMLElement>("[data-section]")];
    const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 1;
    const reached = atEnd
      ? marks.at(-1)
      : marks.findLast((mark) => mark.offsetTop <= box.scrollTop + 16);
    setCategory(reached?.dataset["section"] ?? null);
  };

  const jumpTo = (id: string) => {
    const box = scrollRef.current;
    const mark = box?.querySelector<HTMLElement>(
      `[data-section="${CSS.escape(id)}"]`,
    );
    if (!box || !mark) return;
    box.scrollTop = mark.offsetTop;
    setCategory(id);
  };

  return (
    <Tabs.Root
      value={kind}
      onValueChange={(next) => {
        setKind(next === "icon" ? "icon" : "emoji");
        restart();
      }}
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <Tabs.List
          activateOnFocus
          aria-label="Kind of icon"
          className={cn("border-border flex border p-px", radius.md)}
        >
          {KINDS.map((tab) => (
            <Tabs.Tab
              key={tab}
              value={tab}
              className={tabClass}
              onClick={(event) => {
                if (event.detail > 0) searchRef.current?.focus();
              }}
            >
              {KIND_LABELS[tab]}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {value ? (
          <button
            type="button"
            className={cn(
              textButtonClass,
              "text-muted-foreground hover:text-foreground ms-auto",
            )}
            onClick={() => onChoose(null)}
          >
            Remove
          </button>
        ) : null}
      </div>
      <label
        className={cn(
          "border-input focus-within:border-ring flex h-8 shrink-0 items-center gap-2 border px-2.5 transition-colors duration-150 motion-reduce:transition-none pointer-coarse:h-9",
          radius.md,
        )}
      >
        <Icon {...icons.search} className="text-muted-foreground" />
        <input
          ref={searchRef}
          type="text"
          role="combobox"
          aria-label={`Search ${noun}`}
          aria-autocomplete="list"
          aria-expanded={entries.length > 0}
          aria-controls={listId}
          aria-activedescendant={current ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search"
          value={query}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
          onChange={(event) => {
            setQuery(event.target.value);
            restart();
          }}
          onKeyDown={onKeyDown}
        />
      </label>
      {browsing ? (
        <div
          role="group"
          aria-label="Jump to a category"
          className="flex shrink-0 items-center justify-between"
        >
          {EMOJI_GROUPS.map((group) => (
            <IconButton
              key={group.id}
              label={group.label}
              icon={group.glyph}
              side="top"
              aria-current={
                group.id === (category ?? sections[0]?.id) ? "true" : undefined
              }
              className="aria-[current=true]:bg-accent aria-[current=true]:text-foreground"
              onClick={() => jumpTo(group.id)}
            />
          ))}
        </div>
      ) : null}
      <Tabs.Panel
        ref={scrollRef}
        value={kind}
        tabIndex={-1}
        className="relative -mx-2 min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] overflow-y-auto overscroll-contain px-2 outline-none"
        onScroll={onScroll}
        onMouseDown={(event) => event.preventDefault()}
      >
        {sections.length === 0 ? (
          <p
            role="status"
            className={cn(
              "text-muted-foreground px-1 pt-12 text-center",
              text.bodySm,
            )}
          >
            No {noun} match “{query.trim()}”.
          </p>
        ) : (
          <div
            id={listId}
            role="listbox"
            aria-label={KIND_LABELS[kind]}
            onPointerMove={onPointerMove}
          >
            {sections.map((section, index) => (
              <div
                key={section.id}
                role="group"
                aria-label={section.label}
                data-section={section.id}
              >
                <div
                  role="presentation"
                  className={cn(
                    "text-muted-foreground flex h-7 items-center px-1",
                    text.small,
                  )}
                >
                  {section.label}
                </div>
                <div className="grid grid-cols-8">
                  {section.entries.map((entry, offset) => {
                    const cell = (starts[index] ?? 0) + offset;
                    return (
                      <button
                        key={entry.icon.value}
                        id={`${listId}-${cell}`}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-label={entry.label}
                        aria-selected={sameIcon(entry.icon, value)}
                        data-cell={cell}
                        data-active={cell === active ? "" : undefined}
                        className={cn(
                          "text-muted-foreground data-active:bg-accent data-active:text-foreground aria-selected:text-foreground flex h-8 items-center justify-center outline-none aria-selected:shadow-[inset_0_0_0_1px_var(--ring)] pointer-coarse:h-9",
                          radius.sm,
                        )}
                        onClick={() => choose(entry.icon)}
                      >
                        <PageGlyph
                          icon={entry.icon}
                          className={
                            entry.icon.kind === "emoji"
                              ? "text-foreground size-6 text-xl"
                              : "size-5"
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Tabs.Panel>
    </Tabs.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* The picker, and the page icon above the title that opens it.               */
/* -------------------------------------------------------------------------- */

/**
 * A popover that picks an emoji or an icon. `trigger` is the button that
 * opens it. `onValueChange` gets the pick, or `null` for Remove.
 */
export function IconPicker({
  value,
  onValueChange,
  trigger,
}: {
  value: PageIconValue | undefined;
  onValueChange: (icon: PageIconValue | null) => void;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger ref={triggerRef} render={trigger} />
      <PopoverContent
        aria-label="Page icon"
        // A touch would raise the keyboard over the grid, so it starts on the tabs.
        initialFocus={(pointer) =>
          pointer === "touch" ? true : searchRef.current
        }
        finalFocus={triggerRef}
        className="h-88 max-h-(--available-height) w-68 p-2 pointer-coarse:w-76"
      >
        <IconPanel
          value={value}
          searchRef={searchRef}
          onChoose={(icon) => {
            onValueChange(icon);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function IconTrigger({
  icon,
  ...props
}: ComponentProps<"button"> & { icon: PageIconValue | undefined }) {
  if (!icon) {
    return (
      <button
        type="button"
        {...props}
        className={cn(
          textButtonClass,
          "text-muted-foreground hover:text-foreground -ms-2.5",
        )}
      >
        <Icon {...icons.smile} />
        Add icon
      </button>
    );
  }
  return (
    <Tooltip label="Change icon" side="right">
      <button
        type="button"
        aria-label={`Page icon: ${nameOf(icon)}. Change icon`}
        {...props}
        className={cn(
          focusBorder,
          radius.sm,
          "hover:bg-accent data-popup-open:bg-accent -ms-1.5 flex size-12 items-center justify-center transition-[background-color,scale] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
        )}
      >
        {icon.kind === "emoji" ? (
          <span aria-hidden className="text-4xl leading-none">
            {icon.value}
          </span>
        ) : (
          <Icon {...glyphFor(icon)} strokeWidth={1.25} className="size-9" />
        )}
      </button>
    </Tooltip>
  );
}

/**
 * The page's icon above its title: click it to change or remove it. A page
 * without one shows "Add icon" there when the title area is hovered or the
 * button is focused, and always on a touch screen.
 */
export function PageIcon() {
  const page = useCurrentPage();
  const { icon } = page;

  return (
    <div
      className={cn(
        "flex",
        icon
          ? "mb-2"
          : "-mt-9 h-9 items-center opacity-0 transition-opacity duration-150 focus-within:opacity-100 hover:opacity-100 has-[[data-popup-open]]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100 [&:has(+.doc-title:hover)]:opacity-100",
      )}
    >
      <IconPicker
        value={icon}
        onValueChange={(next) => documentActions.setPageIcon(page.id, next)}
        trigger={<IconTrigger icon={icon} />}
      />
    </div>
  );
}
