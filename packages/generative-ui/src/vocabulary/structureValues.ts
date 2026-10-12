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

/** One label per tab, covering every panel; a missing label falls back to the tab's number. */
export const tabLabels = (labels: unknown, panelCount: number): string[] => {
  const given: unknown[] = Array.isArray(labels) ? labels : [];
  return Array.from(
    { length: Math.max(given.length, panelCount) },
    (_, index) => toText(given[index]) ?? String(index + 1),
  );
};

const LINK = /^https?:\/\/(?:[^/?#@]*@)?([^/?#:]+)/i;

/** `url` when it is an http or https link, the only kind a citation opens. */
export const linkHref = (url: unknown): string | undefined =>
  typeof url === "string" && LINK.test(url) ? url : undefined;

/** The site an http or https link points to, without a leading `www.`. */
export const linkHost = (href: string): string | undefined =>
  LINK.exec(href)?.[1]
    ?.toLowerCase()
    .replace(/^www\./, "");
