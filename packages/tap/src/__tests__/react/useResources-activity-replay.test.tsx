import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { Activity, StrictMode } from "react";
import { resource } from "../../core/resource";
import { withKey } from "../../core/withKey";
import { useResources } from "../../index";
import { cleanupAllResources } from "../test-utils";

// React replays effects without an intervening render when an <Activity>
// boundary is hidden and shown again, and again under StrictMode. The replay's
// teardown unmounts every child fiber useResources holds; the replay's commit
// only recommits children that were re-rendered, so children whose deps are
// unchanged ("skip") stay unmounted. The unmount walk must tolerate that.
describe("useResources under Activity effect replay", () => {
  afterEach(() => {
    cleanupAllResources();
    cleanup();
  });

  it("does not double-unmount bailed-out children", async () => {
    const useItem = (props: { n: number }) => props.n;
    const Item = resource(useItem);

    function List() {
      // Constant deps, so every child bails out ("skip") on re-render.
      useResources([
        withKey("a", Item({ n: 1 }), []),
        withKey("b", Item({ n: 2 }), []),
      ]);
      return null;
    }

    function App({ visible }: { visible: boolean }) {
      return (
        <Activity mode={visible ? "visible" : "hidden"}>
          <List />
        </Activity>
      );
    }

    const view = render(
      <StrictMode>
        <App visible={true} />
      </StrictMode>,
    );

    await act(async () => {
      view.rerender(
        <StrictMode>
          <App visible={false} />
        </StrictMode>,
      );
    });

    await act(async () => {
      view.rerender(
        <StrictMode>
          <App visible={true} />
        </StrictMode>,
      );
    });

    expect(() => view.unmount()).not.toThrow();
  });
});
