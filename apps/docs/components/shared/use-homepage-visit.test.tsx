// @vitest-environment jsdom

import { act, useEffect, useState } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it } from "vitest";
import {
  createPersistedPreference,
  usePersistedPreference,
} from "../../lib/persisted-preference";
import { useHomepageVisit } from "./use-homepage-visit";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const VISITED_KEY = "assistant-ui::docs:homepage-visited";
const DISMISSED_KEY = "assistant-ui::docs:homepage-hiring-banner-dismissed";

const createBooleanPreference = (key: string) =>
  createPersistedPreference<boolean>({
    key,
    fallback: false,
    read: (raw) => (raw === "true" ? true : raw === "false" ? false : null),
    write: (value) => (value ? "true" : "false"),
  });

type VisitState = {
  visited: boolean;
  returningVisitor: boolean;
  dismissed: boolean;
  showBanner: boolean;
};

const renderVisit = async () => {
  const visitedPreference = createBooleanPreference(VISITED_KEY);
  const dismissedPreference = createBooleanPreference(DISMISSED_KEY);
  const state: VisitState = {
    visited: false,
    returningVisitor: false,
    dismissed: false,
    showBanner: false,
  };
  let navigate: ((pathname: string) => void) | undefined;

  function Probe() {
    const [mounted, setMounted] = useState(false);
    const [pathname, setPathname] = useState("/");
    const visited = usePersistedPreference(visitedPreference);
    const dismissed = usePersistedPreference(dismissedPreference);
    const returningVisitor = useHomepageVisit({
      pathname,
      mounted,
      visited,
      setVisited: visitedPreference.set,
    });

    navigate = setPathname;
    useEffect(() => setMounted(true), []);

    state.visited = visited;
    state.returningVisitor = returningVisitor;
    state.dismissed = dismissed;
    state.showBanner =
      mounted && pathname === "/" && returningVisitor && !dismissed;
    return <div>{String(state.showBanner)}</div>;
  }

  const container = document.createElement("div");
  container.innerHTML = renderToString(<Probe />);
  document.body.append(container);

  let root: Root;
  await act(async () => {
    root = hydrateRoot(container, <Probe />);
  });

  return {
    state,
    navigate: (pathname: string) => navigate!(pathname),
    dismiss: () => dismissedPreference.set(true),
    unmount: async () => {
      await act(async () => root.unmount());
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

it("records the first homepage visit without showing the banner", async () => {
  const view = await renderVisit();

  expect(view.state).toEqual({
    visited: true,
    returningVisitor: false,
    dismissed: false,
    showBanner: false,
  });
  expect(localStorage.getItem(VISITED_KEY)).toBe("true");

  await view.unmount();
});

it("shows the banner for a stored visit after hydration", async () => {
  localStorage.setItem(VISITED_KEY, "true");

  const view = await renderVisit();

  expect(view.state).toEqual({
    visited: true,
    returningVisitor: true,
    dismissed: false,
    showBanner: true,
  });

  await view.unmount();
});

it("classifies a homepage return in the same session as returning", async () => {
  const view = await renderVisit();

  await act(async () => view.navigate("/docs"));
  await act(async () => view.navigate("/"));

  expect(view.state).toEqual({
    visited: true,
    returningVisitor: true,
    dismissed: false,
    showBanner: true,
  });

  await view.unmount();
});

it("keeps a dismissed banner hidden", async () => {
  localStorage.setItem(VISITED_KEY, "true");
  const view = await renderVisit();

  await act(async () => view.dismiss());

  expect(view.state).toEqual({
    visited: true,
    returningVisitor: true,
    dismissed: true,
    showBanner: false,
  });
  expect(localStorage.getItem(DISMISSED_KEY)).toBe("true");

  await view.unmount();
});
