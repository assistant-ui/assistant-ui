"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import type { Statewire, StatewireClient } from "statewire";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SetupNavigationContext } from "@/components/shared/setup-navigation";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { AgentChat } from "@/components/pages/shop/agent-chat";
import { SetupWizard } from "@/components/pages/shop/setup-wizard";
import {
  ENTRIES,
  TEXT_PRESETS,
  textPreset,
  type Control,
  type Entry,
  type Scene,
  type Values,
} from "@/components/pages/shop/component-viewer-entries";
import {
  currentPlan,
  openInputs,
  planNeedsReview,
  stepProgress,
  type Checkout,
} from "@/lib/checkout/protocol";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

const CONNECTED: StatewireClient.Connection = {
  status: "connected",
  degraded: false,
  reconnect() {},
};

const checkoutOf = (
  scene: Scene,
  commands: CheckoutContextValue["commands"],
): CheckoutContextValue => {
  const { state } = scene;
  return {
    session: {
      id: "viewer",
      products: state?.products.map((product) => product.slug) ?? [],
      startedAt: 0,
      introSeen: true,
      licenseAccepted: true,
      ...scene.session,
    },
    url: "https://checkout.test/viewer",
    state,
    connection: scene.connection ?? CONNECTED,
    degraded: scene.degraded ?? false,
    commands,
    agentPresent: scene.agentPresent ?? true,
    openInputs: state ? openInputs(state) : [],
    plan: state ? currentPlan(state) : undefined,
    planPending: state ? planNeedsReview(state) : false,
    progress: state ? stepProgress(state) : { done: 0, total: 0 },
    attentionKey: "",
  };
};

const onHashChange = (callback: () => void) => {
  addEventListener("hashchange", callback);
  return () => removeEventListener("hashchange", callback);
};

export function ComponentViewer() {
  const hash = useSyncExternalStore(
    onHashChange,
    () => location.hash.slice(1),
    () => "",
  );
  const entry: Entry = ENTRIES.find((item) => item.id === hash) ?? ENTRIES[0]!;
  const [edits, setEdits] = useState<Record<string, Values>>({});
  const [nonce, setNonce] = useState(0);
  const [calls, setCalls] = useState<string[]>([]);
  const hydrated = useHydrated();

  const log = (line: string) => setCalls((prev) => [...prev.slice(-7), line]);
  const commands = useMemo(
    () =>
      new Proxy({} as Record<string, unknown>, {
        get: (_, name: string) => (params: unknown) => {
          setCalls((prev) => [
            ...prev.slice(-7),
            `${name} ${JSON.stringify(params) ?? ""}`,
          ]);
          return Promise.resolve();
        },
      }) as unknown as Statewire.CommandsProxy<Checkout.Commands>,
    [],
  );

  const values = { ...entry.defaults, ...edits[entry.id] };
  const update = (key: string, value: unknown) =>
    setEdits((prev) => ({
      ...prev,
      [entry.id]: { ...prev[entry.id], [key]: value },
    }));
  const reset = () => {
    setEdits((prev) => ({ ...prev, [entry.id]: {} }));
    setNonce((n) => n + 1);
  };
  const select = (next: Entry) => {
    location.hash = next.id;
  };

  const scene = entry.scene(values);
  const checkout = checkoutOf(scene, commands);
  const groups = [...new Set(ENTRIES.map((item) => item.group))];

  return (
    <SetupNavigationContext.Provider
      value={{
        enterSetup: () => log("enterSetup"),
        leaveSetup: () => log("leaveSetup"),
        resumeHint: false,
        dismissResumeHint: () => {},
      }}
    >
      <div className="grid h-dvh min-w-[84rem] grid-cols-[12rem_minmax(0,1fr)_20rem]">
        <nav className="border-border overflow-y-auto border-r p-3 text-sm">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <p className="text-muted-foreground mb-1 px-2 text-xs font-medium uppercase">
                {group}
              </p>
              {ENTRIES.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={item === entry ? "page" : undefined}
                  onClick={() => select(item)}
                  className={cn(
                    "hover:bg-muted block w-full rounded-md px-2 py-1 text-left",
                    item === entry && "bg-muted font-medium",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <main className="bg-muted/40 dark:bg-background relative isolate flex h-dvh min-h-0 items-center justify-center overflow-hidden p-4 sm:p-8">
          {hydrated && (
            <SetupWizard
              key={`${entry.id}:${scene.initialPage}:${nonce}`}
              checkout={checkout}
              initialPage={scene.initialPage}
            />
          )}
          {hydrated && scene.chat !== undefined && (
            <AgentChat
              checkout={checkout}
              open={scene.chat}
              onOpenChange={(open) => update("open", open)}
            />
          )}
        </main>
        <aside className="border-border flex min-h-0 flex-col border-l">
          <div className="border-border flex items-center justify-between border-b px-4 py-2">
            <h1 className="text-sm font-medium">{entry.label}</h1>
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {entry.controls.map((control) => (
              <Field
                key={control.key}
                control={control}
                values={values}
                typical={entry.defaults}
                onChange={update}
              />
            ))}
            {calls.length > 0 && (
              <div className="text-muted-foreground mt-auto text-xs">
                <p className="mb-1 font-medium">Commands</p>
                <ol className="space-y-1 font-mono break-all">
                  {calls.map((call, index) => (
                    <li key={index}>{call}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </aside>
      </div>
    </SetupNavigationContext.Provider>
  );
}

function Field({
  control,
  values,
  typical,
  onChange,
}: {
  control: Control;
  values: Values;
  typical: Values;
  onChange: (key: string, value: unknown) => void;
}) {
  const value = values[control.key];
  switch (control.kind) {
    case "toggle":
      return (
        <Label className="flex items-center justify-between">
          {control.label}
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => onChange(control.key, checked)}
          />
        </Label>
      );
    case "select":
      return (
        <Labelled label={control.label}>
          <select
            className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(control.key, event.target.value)}
          >
            {control.options.map((option) => (
              <option key={option} value={option}>
                {option || "none"}
              </option>
            ))}
          </select>
        </Labelled>
      );
    case "text": {
      const text = typeof value === "string" ? value : "";
      const base =
        typeof typical[control.key] === "string"
          ? (typical[control.key] as string)
          : text;
      return (
        <Labelled label={control.label}>
          {control.rows ? (
            <Textarea
              rows={control.rows}
              value={text}
              onChange={(event) => onChange(control.key, event.target.value)}
            />
          ) : (
            <Input
              value={text}
              onChange={(event) => onChange(control.key, event.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-1">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="text-muted-foreground hover:text-foreground rounded border px-1.5 text-[11px]"
                onClick={() => onChange(control.key, textPreset(preset, base))}
              >
                {preset}
              </button>
            ))}
          </div>
        </Labelled>
      );
    }
    case "list": {
      const items = Array.isArray(value) ? (value as Values[]) : [];
      const set = (next: Values[]) => onChange(control.key, next);
      return (
        <Labelled label={control.label}>
          {items.map((item, index) => (
            <div
              key={index}
              className="border-border relative flex flex-col gap-2 rounded-md border p-2"
            >
              <button
                type="button"
                aria-label="Remove"
                className="text-muted-foreground hover:text-foreground absolute top-1 right-1"
                onClick={() => set(items.filter((_, i) => i !== index))}
              >
                <XIcon className="size-3.5" />
              </button>
              {control.fields.map((field) => (
                <Field
                  key={field.key}
                  control={field}
                  values={item}
                  typical={control.blank}
                  onChange={(key, fieldValue) =>
                    set(
                      items.map((row, i) =>
                        i === index ? { ...row, [key]: fieldValue } : row,
                      ),
                    )
                  }
                />
              ))}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => set([...items, control.blank])}
          >
            Add
          </Button>
        </Labelled>
      );
    }
  }
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
