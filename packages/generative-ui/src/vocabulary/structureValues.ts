/** A Steps or Timeline entry, keeping only the text an entry may carry. */
export type SequenceItem = { title: string; detail?: string; time?: string };

const toText = (value: unknown): string | undefined =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : undefined;

/** The entries of a Steps or Timeline array that have a title; a malformed entry renders nothing instead of breaking the list. */
export const sequenceItems = (value: unknown): SequenceItem[] =>
  (Array.isArray(value) ? value : []).flatMap((entry: unknown) => {
    if (entry === null || typeof entry !== "object") return [];
    const { title, detail, time } = entry as Record<string, unknown>;
    const titleText = toText(title);
    if (titleText === undefined) return [];
    const detailText = toText(detail);
    const timeText = toText(time);
    return [
      {
        title: titleText,
        ...(detailText !== undefined ? { detail: detailText } : {}),
        ...(timeText !== undefined ? { time: timeText } : {}),
      },
    ];
  });

/** One label per tab, covering every panel: a string, or the `title` of a `{ title, child }` entry as A2UI writes tabs. A missing label falls back to the tab's number. */
export const tabLabels = (labels: unknown, panelCount: number): string[] => {
  const given: unknown[] = Array.isArray(labels) ? labels : [];
  return Array.from(
    { length: Math.max(given.length, panelCount) },
    (_, index) => {
      const entry = given[index];
      const label =
        entry !== null && typeof entry === "object"
          ? (entry as { title?: unknown }).title
          : entry;
      return toText(label) ?? String(index + 1);
    },
  );
};

/** A Map entry with a label and coordinates on the globe. */
export type MapPlace = {
  label: string;
  lat: number;
  lng: number;
  detail?: string;
};

const coordinate = (value: unknown, limit: number): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit;

/** The entries of a Map's `places` with a label and valid coordinates; any other entry is left out. */
export const mapPlaces = (value: unknown): MapPlace[] =>
  (Array.isArray(value) ? value : []).flatMap((entry: unknown) => {
    if (entry === null || typeof entry !== "object") return [];
    const { label, lat, lng, detail } = entry as Record<string, unknown>;
    const labelText = toText(label);
    if (
      labelText === undefined ||
      !coordinate(lat, 90) ||
      !coordinate(lng, 180)
    )
      return [];
    const detailText = toText(detail);
    return [
      {
        label: labelText,
        lat,
        lng,
        ...(detailText !== undefined ? { detail: detailText } : {}),
      },
    ];
  });

/** An OpenStreetMap link centered on a place, for surfaces that cannot draw a map. */
export const placeHref = ({ lat, lng }: MapPlace): string =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`;

// A host of plain DNS labels and a path without whitespace or backslashes: browsers read credentials, spaces, and backslashes in an authority differently from how a regular expression splits it, so such a link could open a different site than the one shown.
const LINK =
  /^https?:\/\/((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?::(\d{1,5}))?(?:[/?#][^\s\\]*)?$/i;

/** `url` when it is an http or https link to a plain host, the only kind a citation opens. */
export const linkHref = (url: unknown): string | undefined => {
  if (typeof url !== "string") return undefined;
  const match = LINK.exec(url);
  return match && Number(match[2] ?? 0) <= 65535 ? url : undefined;
};

/** The site an http or https link points to, without a leading `www.`. */
export const linkHost = (href: string): string | undefined =>
  LINK.exec(href)?.[1]
    ?.toLowerCase()
    .replace(/^www\./, "");
