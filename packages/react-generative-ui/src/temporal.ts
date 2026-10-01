export type TemporalPrecision = "minutes" | "seconds" | number;

export type TemporalInstant = {
  kind: "instant";
  epochMs: number;
  offset: string;
  precision: TemporalPrecision;
  subMillisecondDigits?: string;
};

export type TemporalValue =
  | { kind: "date" | "unparseable"; value: string }
  | {
      kind: "time" | "floating";
      value: string;
      precision: TemporalPrecision;
    }
  | TemporalInstant;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const DATETIME_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d+))?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;
const INPUT_PATTERN =
  /^((?:\d{4}-\d{2}-\d{2}T)?(?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d)(?:\.(\d{1,9}))?)?$/;

export const normalizeTemporalInputValue = (value: string): string => {
  const match = INPUT_PATTERN.exec(value);
  if (!match || match[2] === undefined) return value;
  const digits = match[3] ?? "";
  let end = digits.length;
  while (end > 0 && digits[end - 1] === "0") end--;
  const fraction = digits.slice(0, end);
  if (match[2] === "00" && !fraction) return match[1]!;
  return `${match[1]}:${match[2]}${fraction ? `.${fraction}` : ""}`;
};

const isCalendarDate = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export const classifyTemporal = (value: string): TemporalValue => {
  if (DATE_PATTERN.test(value) && isCalendarDate(value)) {
    return { kind: "date", value };
  }
  const time = TIME_PATTERN.exec(value);
  if (time) {
    return {
      kind: "time",
      value,
      precision: time[3] === undefined ? "minutes" : "seconds",
    };
  }
  const datetime = DATETIME_PATTERN.exec(value);
  if (!datetime || !isCalendarDate(datetime[1]!)) {
    return { kind: "unparseable", value };
  }
  const precision =
    datetime[5]?.length ?? (datetime[4] === undefined ? "minutes" : "seconds");
  const offset = datetime[6];
  if (offset === undefined) return { kind: "floating", value, precision };
  return {
    kind: "instant",
    epochMs: Date.parse(value),
    offset,
    precision,
    ...(datetime[5] && datetime[5].length > 3
      ? { subMillisecondDigits: datetime[5].slice(3) }
      : {}),
  };
};

export const getTemporalInputStep = (
  ...values: (string | undefined)[]
): "any" | 1 | undefined => {
  let step: 1 | undefined;
  for (const value of values) {
    const temporal = classifyTemporal(value ?? "");
    const precision =
      "precision" in temporal
        ? temporal.precision
        : INPUT_PATTERN.exec(value ?? "")?.[3]?.length;
    if (typeof precision === "number") return "any";
    if (precision === "seconds") step = 1;
  }
  return step;
};

export const splitTemporalMinutes = (
  value: string,
  offset?: string,
): { date?: string; time: string; droppedPrecision: boolean } | undefined => {
  const temporal = classifyTemporal(value);
  if (temporal.kind === "date" || temporal.kind === "unparseable")
    return undefined;
  const wallTime =
    temporal.kind === "instant"
      ? formatTemporalInstant(temporal, offset).slice(
          0,
          -(offset ?? temporal.offset).length,
        )
      : temporal.value;
  const end = temporal.kind === "time" ? 5 : 16;
  return {
    ...(temporal.kind === "time" ? {} : { date: wallTime.slice(0, 10) }),
    time: wallTime.slice(end - 5, end),
    droppedPrecision:
      normalizeTemporalInputValue(wallTime) !== wallTime.slice(0, end),
  };
};

export const mergeTemporalMinutes = (date: string, time: string): string => {
  if (
    classifyTemporal(date).kind !== "date" ||
    classifyTemporal(time).kind !== "time"
  )
    return "";
  return `${date}T${time.slice(0, 5)}`;
};

const pad = (value: number, digits = 2): string =>
  String(value).padStart(digits, "0");

const offsetMinutes = (offset: string): number =>
  offset === "Z"
    ? 0
    : (offset.startsWith("-") ? -1 : 1) *
      (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)));

export const formatTemporalInstant = (
  instant: TemporalInstant,
  offset = instant.offset,
  precision = instant.precision,
): string => {
  const date = new Date(instant.epochMs + offsetMinutes(offset) * 60_000);
  const iso = date.toISOString();
  const wallTime =
    precision === "minutes"
      ? iso.slice(0, 16)
      : precision === "seconds"
        ? iso.slice(0, 19)
        : `${iso.slice(0, 19)}.${(pad(date.getUTCMilliseconds(), 3) + (instant.subMillisecondDigits ?? "")).padEnd(precision, "0").slice(0, precision)}`;
  return `${wallTime}${offset}`;
};

export const formatTemporalUnixSeconds = (
  seconds: number,
  offset = "Z",
): string | undefined => {
  if (!Number.isInteger(seconds)) return undefined;
  try {
    const value = formatTemporalInstant({
      kind: "instant",
      epochMs: seconds * 1000,
      offset,
      precision: "seconds",
    });
    return classifyTemporal(value).kind === "instant" ? value : undefined;
  } catch {
    return undefined;
  }
};

export const temporalOffsetLabel = (value: string): string | undefined => {
  const temporal = classifyTemporal(value);
  if (temporal.kind !== "instant") return undefined;
  return temporal.offset === "Z" ? "UTC" : `UTC${temporal.offset}`;
};

export const fromOffsetDateTime = (
  value: string,
  previousValue?: string,
): string => {
  if (value === "") return "";
  if (classifyTemporal(value).kind !== "floating") return value;
  const previous = classifyTemporal(previousValue ?? "");
  if (previous.kind !== "instant") return value;
  const epochMs = Date.parse(`${value}${previous.offset}`);
  const minuteRemainder =
    previous.precision === "minutes"
      ? 0
      : ((previous.epochMs % 60_000) + 60_000) % 60_000;
  return formatTemporalInstant({
    ...previous,
    epochMs: epochMs + minuteRemainder,
  });
};

export const toLocalDateTime = (
  value: string,
  precision?: TemporalPrecision,
): string => {
  const temporal = classifyTemporal(value);
  if (temporal.kind !== "instant") return value;
  const date = new Date(temporal.epochMs);
  const wallTime = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return (precision ?? temporal.precision) === "minutes"
    ? wallTime
    : `${wallTime}:${pad(date.getSeconds())}${typeof precision === "number" ? formatTemporalInstant(temporal, "Z", precision).slice(19, -1) : ""}`;
};

export const fromLocalDateTime = (
  value: string,
  previousValue?: string,
): string => {
  const temporal = classifyTemporal(value);
  const previous = classifyTemporal(previousValue ?? "");
  if (temporal.kind !== "floating" || previous.kind === "floating") {
    return value;
  }
  const date = new Date(value);
  const minutes = -date.getTimezoneOffset();
  const offset = `${minutes < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
  if (previous.kind !== "instant") {
    return formatTemporalInstant({
      kind: "instant",
      epochMs: date.getTime(),
      offset,
      precision: "seconds",
    });
  }
  date.setMilliseconds(new Date(previous.epochMs).getUTCMilliseconds());
  return formatTemporalInstant({ ...previous, epochMs: date.getTime() });
};
