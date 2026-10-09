import { describe, expect, it } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import { provideAui } from "../provideAui";
import { useAuiState } from "../useAuiState";
import {
  threadList,
  threadListItemTrigger,
  threadListNew,
} from "../primitives/threadList";
import Host from "./fixtures/Host.svelte";
import { createEchoRuntime, flushEvents, type AnyClient } from "./clients";

const mountThreadList = () => {
  const echo = createEchoRuntime();
  let aui!: AnyClient;
  let list!: ReturnType<typeof threadList>;
  let newButton!: ReturnType<typeof threadListNew>;
  const app = mount(Host, {
    target: document.createElement("div"),
    props: {
      setup: () => {
        aui = provideAui(
          AuiConfig({ threads: RuntimeAdapter(echo.runtime) }),
        ) as AnyClient;
        list = threadList();
        newButton = threadListNew();
      },
    },
  });
  return { app, echo, aui, list: () => list, newButton: () => newButton };
};

describe("threadList", () => {
  it("exposes the ids and per-item titles", async () => {
    const { app, aui, list } = mountThreadList();
    expect(list().ids).toEqual(["t0"]);

    flushTapSync(() => aui.threads.switchToNewThread());
    await flushEvents();
    expect(list().ids).toEqual(["t0", "t1"]);

    const item = list().item(1);
    item.source.subscribe(() => {});
    const title = useAuiState((s) => s.threadListItem.title, { item });
    expect(title.current).toBe("t1");

    flushSync(() => void unmount(app));
  });

  it("item triggers switch threads and mark the main one active", async () => {
    const { app, echo, aui, list } = mountThreadList();
    flushTapSync(() => aui.threads.switchToNewThread());
    await flushEvents();

    const first = list().item(0);
    const second = list().item(1);
    first.source.subscribe(() => {});
    second.source.subscribe(() => {});
    const firstTrigger = threadListItemTrigger({ item: first });
    const secondTrigger = threadListItemTrigger({ item: second });

    expect(firstTrigger.props["data-active"]).toBeUndefined();
    expect(secondTrigger.props["data-active"]).toBe("true");
    expect(secondTrigger.props["aria-current"]).toBe("true");

    flushTapSync(() => firstTrigger.props.onclick());
    expect(echo.onSwitchToThread).toHaveBeenCalledWith("t0");
    expect(firstTrigger.props["data-active"]).toBe("true");
    expect(secondTrigger.props["data-active"]).toBeUndefined();

    const vetoed = new MouseEvent("click", { cancelable: true });
    vetoed.preventDefault();
    secondTrigger.props.onclick(vetoed);
    expect(firstTrigger.props["data-active"]).toBe("true");

    flushSync(() => void unmount(app));
  });

  it("the new-thread button switches and reports the active state", async () => {
    const { app, echo, list, newButton } = mountThreadList();
    const button = newButton();

    flushTapSync(() => button.props.onclick());
    await flushEvents();
    expect(echo.onSwitchToNewThread).toHaveBeenCalledTimes(1);
    expect(list().ids).toEqual(["t0", "t1"]);

    const vetoed = new MouseEvent("click", { cancelable: true });
    vetoed.preventDefault();
    button.props.onclick(vetoed);
    expect(echo.onSwitchToNewThread).toHaveBeenCalledTimes(1);

    flushSync(() => void unmount(app));
  });
});
