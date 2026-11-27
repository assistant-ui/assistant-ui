"use client";

// Loads the sample's code only on pages that render it. MDX imports reach every
// page of a docs route, so a static import here would ship the Thread element
// and its dependencies to all of them. The page is server-rendered either way.
import { lazyComponent } from "@/lib/lazy-component";

export const ThemeSwitcherSample = lazyComponent(() =>
  import("./theme-switcher").then((mod) => mod.ThemeSwitcherSample),
);
