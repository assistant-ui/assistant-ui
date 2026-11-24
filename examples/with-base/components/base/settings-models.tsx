"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  modelKey,
  toggleModel,
  useChosenModels,
  type ChosenModel,
} from "@/lib/chosen-models";
import { useCatalog, type CatalogProblem } from "@/lib/model-catalog";
import {
  CHAT_TYPES,
  MODELPEDIA_SITE,
  type CatalogModel,
  type CatalogProvider,
} from "@/lib/modelpedia";
import { cn } from "@/lib/utils";
import { Icon, Tip, iconButton } from "./base-thread-shell";
import { FilterMenu, type FilterSection } from "./filter-menu";
import { ProviderIcon } from "./provider-icon";
import { SearchField } from "./search-field";

/* The provider the example's own chat route can run. */
const FIRST_PROVIDER: CatalogProvider = { id: "openai", name: "OpenAI" };

/*
 * Each chosen provider costs a request, so past this many the list of every
 * provider is read instead and narrowed here.
 */
const MAX_PROVIDER_REQUESTS = 6;
const EVERY_PROVIDER: readonly null[] = [null];

/* How many rows show at first, and how many more each Show more brings. */
const ROWS = 100;

type Filters = { providers: readonly string[]; types: readonly string[] };

/* The filter as it was last left, so the section opens the way it closed. */
let lastFilters: Filters = {
  providers: [FIRST_PROVIDER.id],
  types: CHAT_TYPES,
};

const PROBLEMS: Record<CatalogProblem, string> = {
  failed: "The model list did not load.",
  limited: "Modelpedia allows 60 requests a minute. Give it a moment.",
};

const TYPE_LABELS: Record<string, string> = {
  embed: "Embedding",
  tts: "Text to speech",
};

const typeLabel = (type: string) =>
  TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const whole = new Intl.NumberFormat("en");
const relative = new Intl.RelativeTimeFormat("en");

function details(model: CatalogModel) {
  return [
    model.contextWindow !== undefined &&
      `${compact.format(model.contextWindow)} context`,
    model.inputPrice !== undefined &&
      model.outputPrice !== undefined &&
      `$${model.inputPrice} in, $${model.outputPrice} out`,
  ].filter((detail) => typeof detail === "string");
}

function ago(from: number, now: number) {
  const minutes = Math.floor((now - from) / 60_000);
  if (minutes < 1) return "just now";
  return minutes < 60
    ? relative.format(-minutes, "minute")
    : relative.format(-Math.floor(minutes / 60), "hour");
}

/* The time, read again twice a minute so a time told in words keeps up. */
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/* A value once it has stopped changing for `delay` milliseconds. */
function useSettled<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function ModelRow({
  model,
  provider,
  type,
  notes,
  chosen,
}: {
  model: ChosenModel;
  /** The provider's name. */
  provider: string;
  type?: string;
  /** What follows the id on the second line. */
  notes: readonly string[];
  chosen: boolean;
}) {
  /* A model that goes by its id says it once. */
  const named = model.id !== model.name;

  return (
    <li className="flex min-h-11 items-center gap-3 py-1.5">
      <ProviderIcon id={model.provider} name={provider} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{model.name}</span>
          {type && (
            <span className="border-border text-muted-foreground shrink-0 rounded-md border px-1.5 text-[0.6875rem] leading-4">
              {typeLabel(type)}
            </span>
          )}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {named && <span className="font-mono">{model.id}</span>}
          {notes.map((note, index) =>
            named || index > 0 ? ` · ${note}` : note,
          )}
        </span>
      </span>
      <Switch
        aria-label={`Use ${model.name} from ${provider}`}
        checked={chosen}
        onCheckedChange={() => toggleModel(model)}
      />
    </li>
  );
}

function ModelGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col pt-3 first:pt-1"
    >
      <h5
        id={id}
        className="text-muted-foreground flex items-baseline gap-2 pb-0.5 text-xs"
      >
        {label}
        <span className="tabular-nums">{whole.format(count)}</span>
      </h5>
      <ul className="divide-border flex flex-col divide-y">{children}</ul>
    </div>
  );
}

/**
 * The models the composer's menu offers: the ones chosen so far, and the
 * Modelpedia catalog to choose more from, narrowed by provider, by kind and
 * by a search.
 */
export function Models() {
  const chosen = useChosenModels();
  const chosenKeys = new Set(chosen.map(modelKey));
  const [filters, setFilters] = useState(lastFilters);
  const [query, setQuery] = useState("");
  const typed = query.trim().length >= 2 ? query.trim() : "";
  const search = useSettled(typed, typed ? 300 : 0);
  const sources = useMemo<readonly (string | null)[]>(
    () =>
      filters.providers.length === 0 ||
      filters.providers.length > MAX_PROVIDER_REQUESTS
        ? EVERY_PROVIDER
        : filters.providers,
    [filters.providers],
  );
  const catalog = useCatalog(sources, search);
  const now = useNow();
  const [more, setMore] = useState({ view: "", rows: ROWS });

  const providers = [
    ...(catalog.providers.length > 0 ? catalog.providers : [FIRST_PROVIDER]),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const names = new Map(providers.map((entry) => [entry.id, entry.name]));
  const nameOf = (id: string) => names.get(id) ?? id;
  const types = (catalog.types.length > 0 ? catalog.types : CHAT_TYPES)
    .map((type) => ({ value: type, label: typeLabel(type) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const sections: FilterSection[] = [
    {
      id: "providers",
      label: "Providers",
      options: providers.map((entry) => ({
        value: entry.id,
        label: entry.name,
        icon: <ProviderIcon id={entry.id} name={entry.name} />,
      })),
    },
    { id: "types", label: "Type", options: types },
  ];

  const providersOn = new Set(filters.providers);
  const typesOn = new Set(filters.types);
  const matches = (model: CatalogModel) =>
    (providersOn.size === 0 || providersOn.has(model.provider)) &&
    (typesOn.size === 0 || typesOn.has(model.type));

  const lists = catalog.lists.flatMap((list) => list ?? []);
  const groups = catalog.sources
    .flatMap((source, index) => {
      const models = catalog.lists[index]?.models.filter(matches) ?? [];
      if (models.length === 0) return [];
      if (source !== null)
        return [{ id: source, label: nameOf(source), mixed: false, models }];
      const label =
        providersOn.size === 0
          ? "All providers"
          : `${providersOn.size} providers`;
      return [{ id: "", label, mixed: true, models }];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const matching = groups.reduce((sum, group) => sum + group.models.length, 0);
  const looked = lists.reduce(
    (sum, list) => sum + Math.min(list.offset, list.total),
    0,
  );
  const total = lists.reduce((sum, list) => sum + list.total, 0);
  const checkedAt =
    lists.length > 0
      ? Math.min(...lists.map((list) => list.checkedAt))
      : undefined;
  const loading = catalog.waiting || catalog.lists.includes(undefined);

  const view = [filters.providers.join(), filters.types.join(), search].join(
    "\n",
  );
  const rows = more.view === view ? more.rows : ROWS;
  let room = rows;
  const shown = groups.flatMap((group) => {
    const models = group.models.slice(0, room);
    room -= models.length;
    return models.length > 0
      ? [{ ...group, models, count: group.models.length }]
      : [];
  });

  return (
    <>
      <section className="flex flex-col gap-1">
        <h4 className="flex items-baseline gap-2 font-medium">
          Your models
          <span className="text-muted-foreground text-xs font-normal">
            {chosen.length}
          </span>
        </h4>
        {chosen.length === 0 ? (
          <p className="text-muted-foreground">
            None yet. Turn on the ones you want in the list below.
          </p>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {chosen.map((model) => (
              <ModelRow
                key={modelKey(model)}
                model={model}
                provider={nameOf(model.provider)}
                notes={[nameOf(model.provider)]}
                chosen
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <h4 className="me-auto font-medium">All models</h4>
          <p className="text-muted-foreground text-xs">
            {catalog.busy
              ? "Checking"
              : checkedAt !== undefined && (
                  <>
                    Checked{" "}
                    <time dateTime={new Date(checkedAt).toISOString()}>
                      {ago(checkedAt, now)}
                    </time>
                  </>
                )}
          </p>
          <Tip label="Check for new models">
            <button
              type="button"
              onClick={() => {
                if (!catalog.busy) catalog.refresh();
              }}
              className={iconButton}
            >
              <Icon
                icon={ArrowReloadHorizontalIcon}
                className={cn(
                  catalog.busy && "animate-spin motion-reduce:animate-none",
                )}
              />
            </button>
          </Tip>
        </div>
        <div className="flex items-center gap-2">
          <FilterMenu
            sections={sections}
            selected={filters}
            onChange={(section, values) => {
              lastFilters = { ...filters, [section]: values };
              setFilters(lastFilters);
            }}
          />
          <SearchField
            value={query}
            onValueChange={setQuery}
            label="Search models"
          />
        </div>

        <p role="status" className="sr-only">
          {catalog.busy
            ? "Checking"
            : `${whole.format(matching)} ${matching === 1 ? "model" : "models"}`}
        </p>
        {catalog.problem && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground">{PROBLEMS[catalog.problem]}</p>
            <Button variant="ghost" size="sm" onClick={catalog.retry}>
              Try again
            </Button>
          </div>
        )}
        {matching > 0 ? (
          <div
            aria-busy={catalog.busy}
            className={cn(
              "flex flex-col transition-opacity motion-reduce:transition-none",
              catalog.waiting && "opacity-50",
            )}
          >
            {shown.map((group) => (
              <ModelGroup
                key={group.id}
                label={group.label}
                count={group.count}
              >
                {group.models.map((model) => (
                  <ModelRow
                    key={modelKey(model)}
                    model={model}
                    provider={nameOf(model.provider)}
                    type={model.type}
                    notes={[
                      ...(group.mixed ? [nameOf(model.provider)] : []),
                      ...details(model),
                    ]}
                    chosen={chosenKeys.has(modelKey(model))}
                  />
                ))}
              </ModelGroup>
            ))}
          </div>
        ) : (
          !catalog.problem && (
            <p className="text-muted-foreground">
              {loading ? "Loading models" : "No models match"}
            </p>
          )
        )}
        {!catalog.waiting && (matching > rows || looked < total) && (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMore({ view, rows: rows + ROWS });
                if (matching <= rows && !catalog.busy) catalog.loadMore();
              }}
            >
              Show more
            </Button>
            {looked < total && (
              <p className="text-muted-foreground text-xs">
                Looked at {whole.format(looked)} of {whole.format(total)} models
              </p>
            )}
          </div>
        )}
      </section>

      <p className="text-muted-foreground text-xs">
        Model data comes from{" "}
        <a
          href={MODELPEDIA_SITE}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground underline underline-offset-2"
        >
          Modelpedia
        </a>
        . This example&apos;s chat route runs OpenAI models; a model from
        another provider needs a route of your own.
      </p>
    </>
  );
}
