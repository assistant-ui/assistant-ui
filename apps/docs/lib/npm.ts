import "server-only";
import { withTimeout } from "./with-timeout";

const NPM_BASE = "https://api.npmjs.org";

export const NPM_REVALIDATE = {
  WARM: 3600,
  COOL: 21_600,
  COLD: 2_592_000,
} as const;

// api.npmjs.org rate limits per IP, and a deploy asks it about every package at
// once from an address it shares with every other build on the platform. A 429
// there is transient, so a refused request is retried rather than read as no data.
// The wait is jittered because a refusal arrives at the whole fan-out at once,
// and an exact backoff would replay that burst intact.
const RETRY_BACKOFF_MS = [300, 1200];
const jittered = (backoff: number) => backoff / 2 + Math.random() * backoff;

export type NpmDailyDownloads = { day: string; downloads: number };

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function npmAttempt(
  url: string,
  revalidate: number,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  return withTimeout(
    (async () => {
      const res = await fetch(
        url,
        revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } },
      );
      return {
        ok: res.ok,
        status: res.status,
        body: res.ok ? await res.json() : null,
      };
    })(),
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
    await delay(jittered(backoff));
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
