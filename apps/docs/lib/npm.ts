import "server-only";

const NPM_BASE = "https://api.npmjs.org";

export const NPM_REVALIDATE = {
  WARM: 3600,
  COOL: 21_600,
} as const;

export type NpmDailyDownloads = { day: string; downloads: number };

async function npmFetch(
  path: string,
  revalidate: number,
): Promise<NpmDailyDownloads[]> {
  try {
    const res = await fetch(`${NPM_BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = (await res.json()) as { downloads?: NpmDailyDownloads[] };
    return data.downloads ?? [];
  } catch {
    return [];
  }
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

export function getDownloadsLastYear(
  pkg: string,
  revalidate: number = NPM_REVALIDATE.WARM,
): Promise<NpmDailyDownloads[]> {
  return npmFetch(`/downloads/range/last-year/${pkg}`, revalidate);
}
