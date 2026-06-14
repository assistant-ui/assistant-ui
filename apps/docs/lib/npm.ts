import "server-only";

const NPM_BASE = "https://api.npmjs.org";

export const NPM_REVALIDATE = {
  WARM: 3600,
  COOL: 21_600,
} as const;

export type NpmDailyDownloads = { day: string; downloads: number };

async function npmGetJson(path: string, revalidate: number): Promise<unknown> {
  try {
    const res = await fetch(
      `${NPM_BASE}${path}`,
      revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
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
