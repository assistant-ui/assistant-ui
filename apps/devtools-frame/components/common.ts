export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const asBool = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const isStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const formatBoolean = (value: boolean | undefined) =>
  typeof value === "boolean" ? String(value) : undefined;

export const formatDateTime = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

export const truncate = (value: string, max = 120) =>
  value.length > max ? `${value.slice(0, max)}...` : value;

export const formatClockTime = (value: Date) =>
  `${value.getHours().toString().padStart(2, "0")}:${value
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${value.getSeconds().toString().padStart(2, "0")}.${value
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;

export const eventScope = (event: string) => event.split(".")[0] ?? event;

export const extractAttachmentNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((attachment) => {
      if (!isRecord(attachment)) return null;

      if (typeof attachment.name === "string" && attachment.name.length > 0) {
        return attachment.name;
      }
      if (
        typeof attachment.filename === "string" &&
        attachment.filename.length > 0
      ) {
        return attachment.filename;
      }
      if (typeof attachment.type === "string" && attachment.type.length > 0) {
        return attachment.type;
      }
      if (typeof attachment.id === "string" && attachment.id.length > 0) {
        return attachment.id;
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
};
