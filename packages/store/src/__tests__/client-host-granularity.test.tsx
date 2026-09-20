// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource, useResources, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAssistantEmit } from "../utils/tap-assistant-context";

const IDS = [0, 1, 2, 3, 4];

describe("client host granularity", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps child resources with unchanged deps out of a value-only update", () => {
    const runs = IDS.map(() => 0);
    let bump!: () => void;

    const Item = resource(({ id }: { id: number }) => {
      runs[id]! += 1;
      // Every real client reads the assistant tap context; a context marked
      // changed on every update takes the whole list down with it.
      useAssistantEmit();
      return { getState: () => ({ id }) };
    });

    const useListClient = ({ version }: { version: number }) => {
      useResources(IDS.map((id) => withKey(id, Item({ id }), [id])));
      return { getState: () => ({ version }) };
    };
    const ListClient = resource(useListClient);

    const Host = () => {
      const [version, setVersion] = useState(0);
      bump = () => setVersion((v) => v + 1);
      const aui = useAui({
        thread: ListClient({ version }),
      } as unknown as useAui.Props);
      return <AuiProvider value={aui}>{null}</AuiProvider>;
    };

    render(<Host />);
    expect(runs).toEqual([1, 1, 1, 1, 1]);

    act(() => bump());

    expect(runs).toEqual([1, 1, 1, 1, 1]);
  });
});
