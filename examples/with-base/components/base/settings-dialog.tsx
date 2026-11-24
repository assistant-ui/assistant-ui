"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  AiBrain01Icon,
  Analytics01Icon,
  Cancel01Icon,
  ComponentIcon,
  CreditCardIcon,
  Key01Icon,
  KeyboardIcon,
  LockPasswordIcon,
  MagicWand01Icon,
  Mic01Icon,
  WandIcon,
  Settings01Icon,
  Shield01Icon,
  UserAccountIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { Panels, usePanels } from "@/components/panels/panels";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { USED } from "@/lib/assistant-ui";
import { cn } from "@/lib/utils";
import { Icon, row } from "./base-thread-shell";
import { GuestAvatar, useGuest } from "./guest";
import { Appearance } from "./settings-appearance";
import { SearchField } from "./search-field";
import { Models } from "./settings-models";

/*
 * The sections, in the groups the list sets apart: with a rule, or with the
 * group's label where it has one.
 */
const GROUPS = [
  {
    label: null,
    sections: [
      { id: "profile", label: "Profile", icon: UserCircleIcon },
      { id: "account", label: "Account", icon: UserAccountIcon },
      { id: "usage", label: "Usage", icon: Analytics01Icon },
      { id: "billing", label: "Billing", icon: CreditCardIcon },
    ],
  },
  {
    label: null,
    sections: [
      { id: "appearance", label: "Appearance", icon: WandIcon },
      { id: "voice", label: "Voice", icon: Mic01Icon },
      {
        id: "personalization",
        label: "Personalization",
        icon: MagicWand01Icon,
      },
      { id: "configuration", label: "Configuration", icon: Settings01Icon },
      { id: "shortcuts", label: "Keyboard shortcuts", icon: KeyboardIcon },
    ],
  },
  {
    label: null,
    sections: [
      { id: "privacy", label: "Privacy", icon: Shield01Icon },
      { id: "models", label: "Models", icon: AiBrain01Icon },
      { id: "api-keys", label: "API keys", icon: Key01Icon },
      { id: "passwords", label: "Passwords", icon: LockPasswordIcon },
    ],
  },
  {
    label: "Dev",
    sections: [{ id: "components", label: "Components", icon: ComponentIcon }],
  },
] as const;

const SECTIONS = GROUPS.flatMap<(typeof GROUPS)[number]["sections"][number]>(
  (group) => group.sections,
);

export type SettingsSection = (typeof SECTIONS)[number]["id"];

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

/* What a section says to a guest when it only works with an account. */
function SignInPrompt({
  onSignIn,
  children,
}: {
  onSignIn: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground">{children}</p>
      <Button size="sm" onClick={onSignIn}>
        Sign in
      </Button>
    </div>
  );
}

/* A section with nothing in it yet. */
function Empty() {
  return <p className="text-muted-foreground">Nothing to set here yet.</p>;
}

function Profile() {
  const guest = useGuest();

  return (
    <>
      <div className="flex items-center gap-3">
        <GuestAvatar guest={guest} className="size-10 text-sm" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{guest.name}</span>
          <span className="text-muted-foreground">Guest</span>
        </div>
      </div>
      <p className="text-muted-foreground">
        This guest name belongs to this browser&apos;s session.
      </p>
    </>
  );
}

const SHORTCUTS = [
  { label: "Show or hide the sidebar", keys: ["⌘", "B"] },
  { label: "Send the message", keys: ["Enter"] },
  { label: "Add a new line", keys: ["Shift", "Enter"] },
  { label: "Stop the reply or cancel an edit", keys: ["Esc"] },
] as const;

function Shortcuts() {
  return (
    <dl className="divide-border flex flex-col divide-y">
      {SHORTCUTS.map((shortcut) => (
        <div
          key={shortcut.label}
          className="flex h-9 items-center justify-between gap-4"
        >
          <dt>{shortcut.label}</dt>
          <dd className="flex shrink-0 items-center gap-1">
            {shortcut.keys.map((key) => (
              <Kbd key={key} className="h-5 min-w-5 px-1.5 text-[0.6875rem]">
                {key}
              </Kbd>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* What the example takes from assistant-ui, one list for each kind. */
function Components() {
  return (
    <>
      {USED.map((entry) => (
        <section key={entry.kind} className="flex flex-col gap-1">
          <h4 className="flex items-baseline gap-2 font-medium">
            {entry.kind}
            <span className="text-muted-foreground text-xs font-normal">
              {entry.items.length}
            </span>
          </h4>
          {entry.items.length === 0 ? (
            <p className="text-muted-foreground">None</p>
          ) : (
            <ul className="divide-border border-border flex flex-col divide-y border-y">
              {entry.items.map((item) => (
                <li key={item.name} className="flex flex-col gap-0.5 py-1.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <code className="font-mono text-xs">{item.name}</code>
                    <span className="text-muted-foreground truncate font-mono text-xs">
                      {item.from}
                    </span>
                  </div>
                  {item.parts && (
                    <p className="text-muted-foreground text-xs">
                      {item.parts.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

function SectionList() {
  const { closeSheet } = usePanels();
  const [query, setQuery] = useState("");
  const wanted = query.trim().toLowerCase();
  const groups = GROUPS.map((group) => ({
    label: group.label,
    sections: group.sections.filter((section) =>
      section.label.toLowerCase().includes(wanted),
    ),
  })).filter((group) => group.sections.length > 0);

  return (
    <div className="flex flex-col px-2 pb-1 text-[0.8125rem] leading-5">
      <div className="bg-background sticky top-0 z-10 pt-1 pb-2">
        <SearchField
          value={query}
          onValueChange={setQuery}
          label="Search settings"
        />
      </div>
      <Tabs.List className="flex flex-col gap-px">
        {groups.map((group, index) => (
          <Fragment key={group.sections[0]?.id}>
            {index > 0 && !group.label && (
              <div aria-hidden className="bg-border mx-2 my-1 h-px" />
            )}
            {group.label && (
              <p
                role="presentation"
                className="text-muted-foreground mt-1 flex h-6 items-center px-2 text-xs"
              >
                {group.label}
              </p>
            )}
            {group.sections.map((section) => (
              <Tabs.Tab
                key={section.id}
                value={section.id}
                onClick={closeSheet}
                className={cn(row, "data-active:bg-foreground/[0.08] h-7")}
              >
                <Icon
                  icon={section.icon}
                  className="text-muted-foreground size-4 shrink-0"
                />
                <span className="truncate">{section.label}</span>
              </Tabs.Tab>
            ))}
          </Fragment>
        ))}
      </Tabs.List>
      {groups.length === 0 && (
        <p className="text-muted-foreground px-2 py-1">No settings match</p>
      )}
    </div>
  );
}

/*
 * Every Panels listens for its shortcut on the window, so ⌘B would also fold
 * the app's sidebar behind this dialog. While the dialog is open the key is
 * taken here first and given to this sidebar alone.
 */
function SidebarShortcut() {
  const { toggle } = usePanels();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return;
      if (event.key?.toLowerCase() !== "b") return;
      event.preventDefault();
      event.stopPropagation();
      toggle("left");
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [toggle]);

  return null;
}

const panel =
  "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 outline-none";

/**
 * The account's settings: a list of sections in a panel that folds away, and
 * the chosen section beside it. `onSignIn` is asked for by the sections a
 * guest cannot use yet.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  section,
  onSectionChange,
  onSignIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onSignIn: () => void;
}) {
  const current = SECTIONS.find((entry) => entry.id === section);
  const content: Record<SettingsSection, ReactNode> = {
    profile: <Profile />,
    account: (
      <SignInPrompt onSignIn={onSignIn}>
        You are not signed in. Sign in to manage your account.
      </SignInPrompt>
    ),
    usage: (
      <SignInPrompt onSignIn={onSignIn}>
        Sign in to see your usage.
      </SignInPrompt>
    ),
    billing: (
      <SignInPrompt onSignIn={onSignIn}>
        Sign in to manage billing.
      </SignInPrompt>
    ),
    appearance: <Appearance />,
    voice: <Empty />,
    personalization: <Empty />,
    configuration: <Empty />,
    shortcuts: <Shortcuts />,
    privacy: <Empty />,
    "api-keys": (
      <SignInPrompt onSignIn={onSignIn}>
        Sign in to create and manage API keys.
      </SignInPrompt>
    ),
    passwords: (
      <SignInPrompt onSignIn={onSignIn}>
        Sign in to manage your passwords.
      </SignInPrompt>
    ),
    components: <Components />,
    models: <Models />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-background text-foreground flex h-[min(34rem,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0 text-[0.8125rem] leading-5 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <Tabs.Root
          value={section}
          onValueChange={(value) => onSectionChange(value as SettingsSection)}
          orientation="vertical"
          className="flex min-h-0 flex-1 flex-col"
        >
          <Panels
            className="h-auto min-h-0 flex-1"
            toggleAt={{ left: "start" }}
            headers={{
              left: (
                <p aria-hidden className="px-1 text-base font-medium">
                  Settings
                </p>
              ),
              main: (
                <>
                  <h3 className="min-w-0 flex-1 truncate px-1 text-base font-medium">
                    {current?.label}
                  </h3>
                  <DialogClose
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-sm" }),
                      "[&_svg]:text-muted-foreground hover:[&_svg]:text-foreground",
                    )}
                  >
                    <Icon icon={Cancel01Icon} />
                    <span className="sr-only">Close</span>
                  </DialogClose>
                </>
              ),
            }}
            left={<SectionList />}
          >
            <SidebarShortcut />
            {SECTIONS.map((entry) => (
              <Tabs.Panel key={entry.id} value={entry.id} className={panel}>
                {content[entry.id]}
              </Tabs.Panel>
            ))}
          </Panels>
        </Tabs.Root>
      </DialogContent>
    </Dialog>
  );
}
