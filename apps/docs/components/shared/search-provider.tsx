"use client";

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SearchDialog } from "@/components/shared/search-dialog";

const subscribeToNothing = () => () => {};

const getModifierKey = () =>
  /Windows|Linux/i.test(window.navigator.userAgent) ? "Ctrl" : "⌘";

const getServerModifierKey = () => "⌘";

function MetaOrControl() {
  const key = useSyncExternalStore(
    subscribeToNothing,
    getModifierKey,
    getServerModifierKey,
  );
  return <>{key}</>;
}

type HotKeyItem = {
  key: string | ((event: KeyboardEvent) => boolean);
  display: ReactNode;
};

const HOT_KEYS: HotKeyItem[] = [
  {
    key: (event) => event.metaKey || event.ctrlKey,
    display: <MetaOrControl />,
  },
  { key: "k", display: "K" },
];

const SearchContext = createContext<{
  hotKey: HotKeyItem[];
  setOpenSearch: (open: boolean) => void;
}>({ hotKey: HOT_KEYS, setOpenSearch: () => undefined });

export function useSearchContext() {
  return use(SearchContext);
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const matches = HOT_KEYS.every((item) =>
        typeof item.key === "string" ? event.key === item.key : item.key(event),
      );
      if (!matches) return;
      setOpen((prev) => !prev);
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ hotKey: HOT_KEYS, setOpenSearch: setOpen }),
    [],
  );

  return (
    <SearchContext value={value}>
      <SearchDialog open={open} onOpenChange={setOpen} />
      {children}
    </SearchContext>
  );
}
