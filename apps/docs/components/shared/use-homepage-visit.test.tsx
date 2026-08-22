// @vitest-environment jsdom

import { act, useEffect, useState } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it } from "vitest";
import {
  createPersistedPreference,
  usePersistedPreference,
  type PersistedPreference,
} from "../../lib/persisted-preference";
import { useHomepageVisit } from "./use-homepage-visit";

const STORAGE_KEY = "assistant-ui::docs:homepage-visited";

type VisitState = {
  visited: boolean;
  returningVisitor: boolean;
};

const createVisitPreference = () =>
  createPersistedPreference<boolean>({
    key: STORAGE_KEY,
    fallback: false,
    read: (raw) => (raw === "true" ? true : raw === "false" ? false : null),
    write: (value) => (value ? "true" : "false"),
  });

const renderVisit = async (
  preference: PersistedPreference<boolean>,
  state: VisitState,
) => {
  let navigate: ((pathname: string) => void) | undefined;

  function Probe() {
    const [mounted, setMounted] = useState(false);
    const [pathname, setPathname] = useState("/");
    const visited = usePersistedPreference(preference);
    const returningVisitor = useHomepageVisit({
      pathname,
      mounted,
      visited,
      setVisited: preference.set,
    });

    navigate = setPathname;
    useEffect(() => setMounted(true), []);

    state.visited = visited;
    state.returningVisitor = returningVisitor;
    return <div>{`${visited}:${returningVisitor}`}</div>;
  }

  const container = document.createElement("div");
  container.innerHTML = renderToString(<Probe />);
  document.body.append(container);

  let root: Root;
  await act(async () => {
    root = hydrateRoot(container, <Probe />);
  });

  return {
    navigate: (pathname: string) => navigate!(pathname),
    unmount: () => root.unmount(),
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

it("keeps the first homepage visit from showing the banner", async () => {
  const state = { visited: false, returningVisitor: false };
  const preference = createVisitPreference();
  const mounted = await renderVisit(preference, state);

  expect(state).toEqual({ visited: true, returningVisitor: false });
  expect(localStorage.getItem(STORAGE_KEY)).toBe("true");

  mounted.unmount();
});

it("shows the banner for a stored visit after hydration", async () => {
  localStorage.setItem(STORAGE_KEY, "true");
  const state = { visited: false, returningVisitor: false };
  const mounted = await renderVisit(createVisitPreference(), state);

  expect(state).toEqual({ visited: true, returningVisitor: true });

  mounted.unmount();
});

it("rechecks a first visit after leaving and returning to the homepage", async () => {
  const state = { visited: false, returningVisitor: false };
  const mounted = await renderVisit(createVisitPreference(), state);

  expect(state.returningVisitor).toBe(false);

  await act(async () => mounted.navigate("/docs"));
  await act(async () => mounted.navigate("/"));

  expect(state).toEqual({ visited: true, returningVisitor: true });

  mounted.unmount();
});
