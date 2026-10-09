import { getConfig } from "./config";
import { resolveActive, treeOrder, type Snapshot } from "./store";
import { serializeSearch } from "./url";

export type VariantChoice = { id: string; label: string };

export type GroupSelection = {
  id: string;
  label: string;
  kept: VariantChoice;
  removed: VariantChoice[];
  /** The variant this group is nested in, when it is. */
  parent: { group: string; variant: string } | undefined;
};

export type VariantsSelection = {
  /** `page` covers every mounted group; `group` covers one. */
  scope: "page" | "group";
  pathname: string;
  /** Absolute URL that reproduces the selection with `?variant=` params. */
  url: string;
  /** Mounted groups in page order, parents before the groups nested in them. */
  groups: GroupSelection[];
};

/** The default copied text: `/variants choose <group>:<variant> …`. */
export function formatVariantsPrompt(selection: VariantsSelection): string {
  return `/variants choose ${selection.groups
    .map((group) => `${group.id}:${group.kept.id}`)
    .join(" ")}`;
}

export const buildSelection = (
  snapshot: Snapshot,
  location: { origin: string; pathname: string; search: string },
  only?: string,
): VariantsSelection => {
  const groups: GroupSelection[] = [];
  for (const meta of treeOrder(snapshot.groups)) {
    if (only !== undefined && meta.id !== only) continue;
    const activeId = resolveActive(meta, snapshot.selections[meta.id]);
    const kept = meta.variants.find((variant) => variant.id === activeId);
    if (!kept) continue;
    groups.push({
      id: meta.id,
      label: meta.label,
      kept: { id: kept.id, label: kept.label },
      removed: meta.variants
        .filter((variant) => variant.id !== kept.id)
        .map((variant) => ({ id: variant.id, label: variant.label })),
      parent: meta.parent,
    });
  }
  const search = serializeSearch(location.search, {
    selections: new Map(groups.map((group) => [group.id, group.kept.id])),
    hideUI: false,
    clean: false,
    canvas: false,
  });
  return {
    scope: only === undefined ? "page" : "group",
    pathname: location.pathname,
    url: `${location.origin}${location.pathname}${search}`,
    groups,
  };
};

export const promptFor = (
  snapshot: Snapshot,
  location: { origin: string; pathname: string; search: string },
  only?: string,
): string => {
  const selection = buildSelection(snapshot, location, only);
  return (getConfig().prompt ?? formatVariantsPrompt)(selection);
};

/** Copies text with the async Clipboard API, falling back to a hidden textarea. */
export const copyText = async (
  text: string,
  restoreFocus?: HTMLElement,
): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {}
  textarea.remove();
  restoreFocus?.focus();
  return copied;
};
