// @vitest-environment jsdom

import { useState, type FC } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource, useResources, withKey } from "@assistant-ui/tap";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useAssistantEmit } from "../utils/tap-assistant-context";

const IDS = [0, 1, 2, 3, 4];

type ListState = { version: number };

const createList = () => {
  const runs = IDS.map(() => 0);

  const Item = resource(({ id }: { id: number }) => {
    runs[id]! += 1;
    // Every real client reads the assistant tap context; a context marked
    // changed on every update takes the whole list down with it.
    useAssistantEmit();
    return { getState: () => ({ id }) };
  });

  const useListClient = ({ version }: { version: number }) => {
    useResources(IDS.map((id) => withKey(id, Item({ id }), [id])));
    return { getState: (): ListState => ({ version }) };
  };

  return { runs, ListClient: resource(useListClient) };
};

const Version: FC<{ onVersion: (version: number) => void }> = ({
  onVersion,
}) => {
  onVersion(useAuiState((s) => (s.thread as unknown as ListState).version));
  return null;
};

// Both hosts share useAuiRoot, where the context value lives, but deliver
// updates differently: the config path rides React's scheduler, the
// deprecated props overload a self-scheduled tap root.
const hosts = {
  "AuiProvider config": (
    ListClient: ReturnType<typeof createList>["ListClient"],
    onVersion: (version: number) => void,
    version: number,
  ) => (
    <AuiProvider
      config={AuiConfig({ thread: ListClient({ version }) } as never)}
    >
      <Version onVersion={onVersion} />
    </AuiProvider>
  ),
  "useAui props": (
    ListClient: ReturnType<typeof createList>["ListClient"],
    onVersion: (version: number) => void,
    version: number,
  ) => {
    const aui = useAui({
      thread: ListClient({ version }),
    } as unknown as useAui.Props);
    return (
      <AuiProvider value={aui}>
        <Version onVersion={onVersion} />
      </AuiProvider>
    );
  },
};

describe("client host granularity", () => {
  afterEach(() => {
    cleanup();
  });

  for (const [name, host] of Object.entries(hosts)) {
    it(`${name}: keeps child resources with unchanged deps out of a value-only update`, () => {
      const { runs, ListClient } = createList();
      let observed = -1;
      let bump!: () => void;

      const Host = () => {
        const [version, setVersion] = useState(0);
        bump = () => setVersion((v) => v + 1);
        return host(
          ListClient,
          (version) => {
            observed = version;
          },
          version,
        );
      };

      render(<Host />);
      expect(runs).toEqual([1, 1, 1, 1, 1]);
      expect(observed).toBe(0);

      act(() => bump());

      expect(observed).toBe(1);
      expect(runs).toEqual([1, 1, 1, 1, 1]);
    });
  }
});
