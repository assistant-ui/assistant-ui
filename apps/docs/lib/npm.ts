import "server-only";
import { withTimeout } from "./with-timeout";

const NPM_BASE = "https://api.npmjs.org";

export const NPM_REVALIDATE = {
  WARM: 3600,
  COOL: 21_600,
  COLD: 2_592_000,
} as const;

// api.npmjs.org rate limits per IP, and a deploy asks it about every package at
// once from an address it shares with every other build on the platform. Pacing
// the requests and retrying a refusal is what keeps a burst from reading as no
// data. The pacing sits inside the deadline so a queued caller still gives up.
const MAX_IN_FLIGHT = 4;
const RETRY_BACKOFF_MS = [300, 1200];

export type NpmDailyDownloads = { day: string; downloads: number };

let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(run: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  inFlight++;
  try {
    return await run();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function npmAttempt(
  url: string,
  revalidate: number,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  return withTimeout(
    withSlot(async () => {
      const res = await fetch(
        url,
        revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } },
      );
      return {
        ok: res.ok,
        status: res.status,
        body: res.ok ? await res.json() : null,
      };
    }),
  );
}

async function npmGetJson(path: string, revalidate: number): Promise<unknown> {
  const url = `${NPM_BASE}${path}`;

  for (let attempt = 0; ; attempt++) {
    let result: Awaited<ReturnType<typeof npmAttempt>>;
    try {
      result = await npmAttempt(url, revalidate);
    } catch (error) {
      console.error(`npm ${path} could not be read.`, error);
      return null;
    }
    if (result.ok) return result.body;

    const backoff = RETRY_BACKOFF_MS[attempt];
    if (result.status !== 429 || backoff === undefined) {
      console.error(`npm ${path} answered ${result.status}.`);
      return null;
    }
    await delay(backoff);
  }
}

async function npmFetch(
  path: string,
  revalidate: number,
): Promise<NpmDailyDownloads[]> {
  const data = (await npmGetJson(path, revalidate)) as {
    downloads?: NpmDailyDownloads[];
  } | null;
  return data?.downloads ?? [];
}

export function getDownloadsRange(
  pkg: string,
  startDate: string,
  endDate: string,
  revalidate: number = NPM_REVALIDATE.WARM,
): Promise<NpmDailyDownloads[]> {
  return npmFetch(
    `/downloads/range/${startDate}:${endDate}/${pkg}`,
    revalidate,
  );
}

// The flagship package; its last-week downloads stand in for the headline figure.
export const FLAGSHIP_PACKAGE = "@assistant-ui/react";

export async function getWeeklyDownloads(
  pkg: string = FLAGSHIP_PACKAGE,
  revalidate: number = NPM_REVALIDATE.COOL,
): Promise<number | null> {
  const data = (await npmGetJson(
    `/downloads/point/last-week/${pkg}`,
    revalidate,
  )) as { downloads?: number } | null;
  return typeof data?.downloads === "number" ? data.downloads : null;
}
