"use client";

import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowUpRightIcon,
  BotIcon,
  CheckIcon,
  CopyIcon,
  ShoppingCartIcon,
  XIcon,
} from "lucide-react";
import {
  starterCommand,
  starterId,
  starterPrompt,
  starterSourceHref,
  type Starter,
} from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import {
  setLibraryCartOpen,
  toggleLibraryCartItem,
  useLibraryCart,
} from "./cart-store";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import { StarterPreview } from "./starter-card";

const button =
  "focus-visible:ring-ring inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

function Detail({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs">{title}</h3>
      {children}
    </section>
  );
}

function CodeList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="bg-foreground/[0.04] rounded-md px-2 py-1 font-mono text-xs [font-variant-ligatures:none]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function DependencyList({
  title,
  hint,
  items,
  layout = "chips",
}: {
  title: string;
  hint: string;
  items: readonly string[];
  layout?: "chips" | "lines";
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {items.length}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{hint}</p>
      {items.length === 0 ? null : layout === "lines" ? (
        <ul className="bg-foreground/[0.025] dark:bg-foreground/[0.04] max-h-56 overflow-y-auto rounded-xl px-3 py-2 font-mono text-xs leading-6 [font-variant-ligatures:none]">
          {items.map((item) => (
            <li key={item} className="truncate">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <CodeList items={items} />
      )}
      {items.length > 0 ? null : <p className="text-sm">None.</p>}
    </section>
  );
}

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "setup", label: "Setup" },
  { value: "dependencies", label: "Dependencies" },
] as const;

function CommandLine({ command }: { command: string }) {
  return (
    <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex items-center gap-2 rounded-xl py-1 ps-3 pe-1">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap [font-variant-ligatures:none]">
        {command}
      </code>
      <button
        type="button"
        aria-label="Copy command"
        onClick={() => copyWithLibraryToast(command, "Command copied.")}
        className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2"
      >
        <CopyIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="bg-foreground/[0.06] grid size-6 shrink-0 place-items-center rounded-full text-xs tabular-nums">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function StarterDetails({ starter }: { starter: Starter }) {
  const command = starterCommand(starter);
  const inCart = useLibraryCart().includes(starterId(starter));
  const facts = [
    ["Type", starter.kind === "template" ? "Template" : "Example"],
    ["Framework", starter.framework],
    ["Backend", starter.backend ?? "None"],
  ] as const;

  return (
    <>
      <div className="bg-foreground/[0.03] dark:bg-foreground/[0.045] m-2 rounded-[22px] p-4">
        <div className="bg-background relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-xl">
          <StarterPreview starter={starter} sizes="640px" />
        </div>
      </div>
      <div className="flex flex-col gap-6 px-6 pt-3 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Dialog.Title className="text-xl font-medium">
              {starter.label}
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground text-sm">
              {starter.description}
            </Dialog.Description>
          </div>
          <a
            href={starterSourceHref(starter)}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-1.5 inline-flex shrink-0 items-center gap-1 rounded-sm text-sm underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-2"
          >
            View repo
            <ArrowUpRightIcon aria-hidden className="size-3.5" />
            <span className="sr-only">on GitHub (opens in a new tab)</span>
          </a>
        </div>

        <Tabs.Root defaultValue="overview" className="flex flex-col gap-5">
          <Tabs.List
            aria-label="Starter details"
            className="flex flex-wrap gap-1"
          >
            {TABS.map((tab) => (
              <Tabs.Tab
                key={tab.value}
                value={tab.value}
                className="text-muted-foreground hover:text-foreground data-active:bg-foreground/[0.06] data-active:text-foreground dark:data-active:bg-foreground/[0.09] focus-visible:ring-ring h-8 cursor-pointer rounded-full px-3.5 text-sm transition-colors outline-none focus-visible:ring-2"
              >
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel
            value="overview"
            className="flex flex-col gap-6 outline-none"
          >
            <Detail title="Create it">
              <CommandLine command={command} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyWithLibraryToast(
                      starterPrompt(starter),
                      "Agent prompt copied.",
                    )
                  }
                  className={cn(
                    button,
                    "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  <BotIcon aria-hidden />
                  Copy agent prompt
                </button>
                <button
                  type="button"
                  aria-pressed={inCart}
                  onClick={() => {
                    const added = toggleLibraryCartItem(starterId(starter));
                    libraryToast.success(
                      added
                        ? `${starter.label} added to cart.`
                        : `${starter.label} removed from cart.`,
                      {
                        group: "cart",
                        action: {
                          label: "View cart",
                          onClick: () => setLibraryCartOpen(true),
                        },
                      },
                    );
                  }}
                  className={cn(
                    button,
                    "bg-foreground/[0.06] hover:bg-foreground/[0.1]",
                  )}
                >
                  {inCart ? (
                    <CheckIcon aria-hidden />
                  ) : (
                    <ShoppingCartIcon aria-hidden />
                  )}
                  {inCart ? "In cart" : "Add to cart"}
                </button>
              </div>
            </Detail>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Tabs.Panel>

          <Tabs.Panel value="setup" className="outline-none">
            <ol className="flex flex-col gap-5">
              <Step number={1} title="Create the project">
                <CommandLine command={command} />
              </Step>
              <Step number={2} title="Set its environment variables">
                {starter.env.length > 0 ? (
                  <>
                    <p className="text-muted-foreground text-sm">
                      Start from the project&apos;s{" "}
                      <span className="font-mono text-xs">.env.example</span>.
                    </p>
                    <CodeList items={starter.env} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">None to set.</p>
                )}
              </Step>
              <Step number={3} title="Start it">
                <CommandLine
                  command={`cd my-app && npm run ${starter.devScript ?? "dev"}`}
                />
              </Step>
            </ol>
          </Tabs.Panel>

          <Tabs.Panel
            value="dependencies"
            className="flex flex-col gap-6 outline-none"
          >
            {starter.componentsIncluded ? (
              <p className="text-muted-foreground text-sm">
                This {starter.kind}&apos;s components ship inside it, so create
                copies them with the project instead of installing them from the
                registry.
              </p>
            ) : null}
            <DependencyList
              title="Registry components"
              hint={
                starter.componentsIncluded
                  ? "assistant-ui components the project imports."
                  : "Every assistant-ui item create installs, including the ones other items need."
              }
              items={starter.components}
            />
            <DependencyList
              title="UI components"
              hint={
                starter.componentsIncluded
                  ? "shadcn/ui components the project imports."
                  : "Every shadcn/ui item create installs, including the ones other items need."
              }
              items={starter.uiComponents}
            />
            <DependencyList
              title={
                starter.componentsIncluded ? "Component files" : "Files created"
              }
              hint={
                starter.componentsIncluded
                  ? "The component, hook, and lib files in the starter."
                  : "The files those items write into the project."
              }
              items={starter.files}
              layout="lines"
            />
            <DependencyList
              title="npm packages"
              hint="The project's dependencies once the components are installed."
              items={starter.dependencies}
            />
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </>
  );
}

/** `starter` stays set while the dialog closes, so its content holds through the exit animation. */
export function StarterDialog({
  starter,
  open,
  onOpenChange,
}: {
  starter: Starter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          ref={popupRef}
          tabIndex={-1}
          initialFocus={popupRef}
          className="bg-background ring-foreground/10 fixed top-[max(1rem,6vh)] left-1/2 z-50 max-h-[calc(100dvh-max(2rem,12vh))] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-[30px] shadow-xl ring-1 transition-[opacity,scale] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none"
        >
          {starter ? <StarterDetails starter={starter} /> : null}
          <Dialog.Close
            aria-label="Close"
            className="bg-background/45 text-foreground ring-foreground/10 hover:bg-background/70 focus-visible:ring-ring absolute top-5 right-5 grid size-8 cursor-pointer place-items-center rounded-full ring-1 backdrop-blur-md transition-colors outline-none focus-visible:ring-2"
          >
            <XIcon aria-hidden className="size-4" />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
