/*
 * The model catalog comes from the Modelpedia API, which needs no key and
 * answers any origin, so the browser asks it directly. `/models` takes one
 * provider at a time and has no filter for the kind of model, so the settings
 * page asks once for each chosen provider and narrows by kind itself.
 */

export const MODELPEDIA_SITE = "https://modelpedia.dev";
export const MODELPEDIA_API = "https://api.modelpedia.dev/v1";

/* The most `/models` gives in one answer. */
export const MODELS_PAGE_SIZE = 500;

/* The kinds of model a chat can talk to; the catalog also lists the rest. */
export const CHAT_TYPES: readonly string[] = ["chat", "reasoning", "code"];

/* The kind the catalog counts a model under when the model names none. */
const UNKNOWN_TYPE = "unknown";

export type CatalogProvider = { id: string; name: string };

export type CatalogModel = {
  provider: string;
  id: string;
  name: string;
  /** What the model is for: chat, image, audio and so on. */
  type: string;
  /** Tokens the model can read at once. */
  contextWindow?: number;
  /** USD for a million tokens in, and out. */
  inputPrice?: number;
  outputPrice?: number;
};

/**
 * Modelpedia turned a request down, or this page held one back. A `limited`
 * one fell to the limit on requests and works again within a minute.
 */
export class ModelpediaError extends Error {
  readonly limited: boolean;

  constructor(status: number) {
    super(`Modelpedia answered ${status}.`);
    this.limited = status === 429;
  }
}

/*
 * Modelpedia allows each address 60 requests a minute. This page stops
 * itself short of that, so a burst of typing ends in a pause it can explain
 * and not in an address that is turned away.
 */
const REQUESTS_A_MINUTE = 50;
const sent: number[] = [];

function countRequest() {
  const now = Date.now();
  while (sent[0] !== undefined && now - sent[0] >= 60_000) sent.shift();
  if (sent.length >= REQUESTS_A_MINUTE) throw new ModelpediaError(429);
  sent.push(now);
}

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row =>
  typeof value === "object" && value !== null;

async function get(path: string, signal: AbortSignal) {
  countRequest();
  const response = await fetch(`${MODELPEDIA_API}${path}`, { signal });
  if (!response.ok) throw new ModelpediaError(response.status);
  const body: unknown = await response.json();
  if (!isRow(body) || !Array.isArray(body["data"]))
    throw new Error(
      "Modelpedia sent an answer in a shape this app cannot read.",
    );
  return {
    rows: body["data"].filter(isRow),
    total: isRow(body["meta"]) ? body["meta"]["total"] : undefined,
  };
}

export async function listProviders(
  signal: AbortSignal,
): Promise<CatalogProvider[]> {
  const { rows } = await get("/providers", signal);
  return rows.flatMap((row) =>
    typeof row["id"] === "string" && typeof row["name"] === "string"
      ? [{ id: row["id"], name: row["name"] }]
      : [],
  );
}

/** The kinds of model the catalog holds, the most common first. */
export async function listTypes(signal: AbortSignal): Promise<string[]> {
  const { rows } = await get("/models/types", signal);
  return rows.flatMap((row) =>
    typeof row["name"] === "string" ? [row["name"]] : [],
  );
}

function toModel(row: Row): CatalogModel | null {
  const { provider, id, name, model_type, context_window, pricing } = row;
  if (
    typeof provider !== "string" ||
    typeof id !== "string" ||
    typeof name !== "string"
  )
    return null;
  const prices = isRow(pricing) ? pricing : {};
  return {
    provider,
    id,
    name,
    type: typeof model_type === "string" ? model_type : UNKNOWN_TYPE,
    ...(typeof context_window === "number"
      ? { contextWindow: context_window }
      : {}),
    ...(typeof prices["input"] === "number"
      ? { inputPrice: prices["input"] }
      : {}),
    ...(typeof prices["output"] === "number"
      ? { outputPrice: prices["output"] }
      : {}),
  };
}

/**
 * One page of the active models, by name: a provider's, or every provider's
 * when none is named. `total` counts the models the catalog has for the
 * request, across all its pages.
 */
export async function listModels(
  {
    provider,
    query,
    offset,
  }: { provider: string | null; query: string; offset: number },
  signal: AbortSignal,
): Promise<{ models: CatalogModel[]; total: number }> {
  const params = new URLSearchParams({
    status: "active",
    sort: "name",
    limit: String(MODELS_PAGE_SIZE),
    offset: String(offset),
  });
  if (provider !== null) params.set("provider", provider);
  if (query.length >= 2) params.set("q", query);
  const { rows, total } = await get(`/models?${params}`, signal);
  return {
    models: rows.flatMap((row) => toModel(row) ?? []),
    total: typeof total === "number" ? total : offset + rows.length,
  };
}
