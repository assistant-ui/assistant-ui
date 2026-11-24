"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  Add01Icon,
  ArrowRight02Icon,
  Cancel01Icon,
  InformationCircleIcon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
  Search01Icon,
  Sorting05Icon,
} from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { togglePin, usePins } from "@/lib/pins";
import { cn } from "@/lib/utils";
import {
  CHAT_PATH,
  Icon,
  MORE,
  Menu,
  MenuChoice,
  MenuItem,
  MenuLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuTrigger,
  Tip,
  iconButton,
  menuItem,
} from "./base-thread-shell";
import { ItemGlyph, type ItemGlyphKind } from "./item-glyph";

type Place = {
  id: ItemGlyphKind;
  label: string;
  description: string;
  /** The place's page, for a place that has one. */
  href?: string;
};

/* Chat, then the places the More menu lists. */
const PLACES: readonly Place[] = [
  {
    id: "chat",
    label: "Chat",
    description: "Talk a task through with your agent.",
    href: CHAT_PATH,
  },
  ...MORE,
];

const SORTS = [
  { value: "pinned", label: "Pinned first" },
  { value: "name", label: "Name" },
] as const;

function PlaceMenu({
  place,
  pinned,
  onInfo,
}: {
  place: Place;
  pinned: boolean;
  onInfo: () => void;
}) {
  return (
    <Menu>
      <Tip label={`Options for ${place.label}`}>
        <MenuTrigger
          className={cn(
            iconButton,
            "data-popup-open:bg-foreground/[0.07] data-popup-open:text-foreground relative",
          )}
        >
          <Icon icon={MoreHorizontalIcon} />
        </MenuTrigger>
      </Tip>
      <MenuPopup align="end">
        {place.href && (
          <MenuPrimitive.LinkItem
            closeOnClick
            render={<Link href={place.href} />}
            className={menuItem}
          >
            <Icon icon={ArrowRight02Icon} />
            Open
          </MenuPrimitive.LinkItem>
        )}
        <MenuItem onClick={() => togglePin(place.id)}>
          <Icon icon={pinned ? PinOffIcon : PinIcon} />
          {pinned ? "Unpin" : "Pin"}
        </MenuItem>
        <MenuItem onClick={onInfo}>
          <Icon icon={InformationCircleIcon} />
          Info
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

/** The home page: every place in the app, to search, sort and pin. */
export function Home() {
  const pins = usePins();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<string>(SORTS[0].value);
  const [info, setInfo] = useState<Place | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const wanted = query.trim().toLowerCase();
  const places = PLACES.filter((place) =>
    `${place.label} ${place.description}`.toLowerCase().includes(wanted),
  ).sort((a, b) =>
    sort === "name"
      ? a.label.localeCompare(b.label)
      : Number(pins.has(b.id)) - Number(pins.has(a.id)),
  );

  return (
    <div className="@container h-full overflow-y-auto px-4">
      <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-6 pt-6 pb-10">
        <div className="flex flex-col gap-4 @xl:flex-row @xl:items-start @xl:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl leading-8 tracking-tight">Home</h1>
            <p className="text-muted-foreground text-sm leading-5">
              Everything in AgentBase, in one place.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <InputGroup className="h-8 rounded-lg @xl:w-60">
              <InputGroupAddon>
                <Icon icon={Search01Icon} />
              </InputGroupAddon>
              <InputGroupInput
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search home"
                className="h-full pe-1.5 text-[0.8125rem] focus-visible:bg-transparent md:text-[0.8125rem] [&::-webkit-search-cancel-button]:hidden"
              />
              {/* Not an addon: a click in the menu would reach it and move the focus to the field. */}
              <div className="flex shrink-0 items-center gap-0.5 pe-1">
                {query && (
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear the search"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                  >
                    <Icon icon={Cancel01Icon} />
                  </InputGroupButton>
                )}
                <Menu>
                  <Tip label="Sort">
                    <MenuTrigger
                      className={cn(
                        iconButton,
                        "data-popup-open:bg-foreground/[0.07] size-6",
                      )}
                    >
                      <Icon icon={Sorting05Icon} />
                    </MenuTrigger>
                  </Tip>
                  <MenuPopup align="end">
                    <MenuLabel>Sort by</MenuLabel>
                    <MenuRadioGroup value={sort} onValueChange={setSort}>
                      {SORTS.map((choice) => (
                        <MenuChoice key={choice.value} value={choice.value}>
                          {choice.label}
                        </MenuChoice>
                      ))}
                    </MenuRadioGroup>
                  </MenuPopup>
                </Menu>
              </div>
            </InputGroup>
            <button
              type="button"
              className={cn(buttonVariants(), "text-[0.8125rem]")}
            >
              <Icon icon={Add01Icon} />
              Add
            </button>
          </div>
        </div>

        <ul className="grid gap-2 empty:hidden @xl:grid-cols-2">
          {places.map((place) => (
            <li
              key={place.id}
              data-item-glyph-host=""
              className="group/glyph has-[a:hover]:bg-foreground/[0.03] relative flex h-14 min-w-0 items-center gap-3 rounded-2xl border ps-2.5 pe-3 transition-colors motion-reduce:transition-none"
            >
              <ItemGlyph kind={place.id} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-1.5">
                  {place.href ? (
                    <Link
                      href={place.href}
                      className="focus-visible:after:ring-primary/60 truncate outline-hidden after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2"
                    >
                      {place.label}
                    </Link>
                  ) : (
                    <span className="truncate">{place.label}</span>
                  )}
                  {pins.has(place.id) && (
                    <>
                      <Icon
                        icon={PinIcon}
                        className="text-muted-foreground size-3.5 shrink-0"
                      />
                      <span className="sr-only">, pinned</span>
                    </>
                  )}
                </span>
                <span className="text-muted-foreground truncate">
                  {place.description}
                </span>
              </span>
              <PlaceMenu
                place={place}
                pinned={pins.has(place.id)}
                onInfo={() => {
                  setInfo(place);
                  setInfoOpen(true);
                }}
              />
            </li>
          ))}
        </ul>
        <p role="status" className="text-muted-foreground empty:hidden">
          {places.length === 0 && "Nothing matches"}
        </p>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="bg-background sm:max-w-sm">
          {info && (
            <div className="flex items-center gap-3 pe-6">
              <ItemGlyph kind={info.id} />
              <DialogHeader className="min-w-0 gap-1">
                <DialogTitle>{info.label}</DialogTitle>
                <DialogDescription>{info.description}</DialogDescription>
              </DialogHeader>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
