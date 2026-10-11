export type Option = { label: string; description?: string; value: string };

export const isOption = (option: unknown): option is Option =>
  option !== null &&
  typeof option === "object" &&
  "label" in option &&
  typeof option.label === "string" &&
  (!("description" in option) || typeof option.description === "string") &&
  "value" in option &&
  typeof option.value === "string";

export const mapOptions = <T>(
  options: unknown,
  render: (option: Option, key: string) => T,
) => {
  const occurrences = new Map<string, number>();
  return (Array.isArray(options) ? options : []).map((option) => {
    if (!isOption(option)) return null;
    const occurrence = occurrences.get(option.value) ?? 0;
    occurrences.set(option.value, occurrence + 1);
    return render(option, JSON.stringify([option.value, occurrence]));
  });
};

export const finiteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const UNDO_WINDOW_SECONDS = 5;
