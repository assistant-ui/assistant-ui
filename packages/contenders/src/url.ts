export const ALL = "all";

export type UrlState = {
  selections: Map<string, string>;
  globalAll: boolean;
  hideUI: boolean;
  clean: boolean;
};

const splitList = (values: string[]) =>
  values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

export const parseSearch = (search: string): UrlState => {
  const params = new URLSearchParams(search);
  const selections = new Map<string, string>();
  for (const entry of splitList(params.getAll("variant"))) {
    const colon = entry.indexOf(":");
    if (colon <= 0 || colon === entry.length - 1) continue;
    selections.set(entry.slice(0, colon), entry.slice(colon + 1));
  }
  const flags = splitList(params.getAll("variants"));
  return {
    selections,
    globalAll: flags.includes(ALL),
    hideUI: flags.includes("noui"),
    clean: flags.includes("clean"),
  };
};

const encode = (value: string) =>
  encodeURIComponent(value).replace(/%3A/gi, ":");

export const serializeSearch = (search: string, state: UrlState): string => {
  const params = new URLSearchParams(search);
  params.delete("variant");
  params.delete("variants");
  const parts: string[] = [];
  const rest = params.toString();
  if (rest) parts.push(rest);
  for (const [group, value] of state.selections) {
    parts.push(`variant=${encode(group)}:${encode(value)}`);
  }
  const flags = [
    ...(state.globalAll ? [ALL] : []),
    ...(state.hideUI ? ["noui"] : []),
    ...(state.clean ? ["clean"] : []),
  ];
  if (flags.length > 0) parts.push(`variants=${flags.join(",")}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
};
