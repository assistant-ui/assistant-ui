"use client";

// Loads the sample's code only on pages that render it. MDX imports reach every
// page of a docs route, so a static import here would ship this sample's
// dependencies to all of them. The page is server-rendered either way.
import { lazyComponent } from "@/lib/lazy-component";

export const RsvpDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.RsvpDemo),
);

export const CounterDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.CounterDemo),
);

export const StarsDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.StarsDemo),
);

export const NoteDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.NoteDemo),
);

export const TagsDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.TagsDemo),
);

export const PanelDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.PanelDemo),
);

export const CenteredDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.CenteredDemo),
);

export const GreetingDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.GreetingDemo),
);

export const SearchDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.SearchDemo),
);

export const FallbackDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.FallbackDemo),
);

export const ErrorsDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.ErrorsDemo),
);

export const FailuresDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.FailuresDemo),
);

export const ThemeDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.ThemeDemo),
);

export const ShippingDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.ShippingDemo),
);

export const MenuDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.MenuDemo),
);

export const DialogDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.DialogDemo),
);

export const WeatherDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.WeatherDemo),
);

export const ProbeDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.ProbeDemo),
);

export const HtmlEditorDemo = lazyComponent(() =>
  import("./demos").then((mod) => mod.HtmlEditorDemo),
);
