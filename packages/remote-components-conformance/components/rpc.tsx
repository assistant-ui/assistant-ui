import { useEffect, useState } from "react";

interface Props {
  count?: number;
  when?: Date;
  tags?: Map<string, number>;
  nested?: { deep: { fn?: (x: number) => Promise<number> } };
  onCompute?: (a: number, b: number) => Promise<number>;
  onFail?: () => Promise<void>;
  onSlow?: () => Promise<string>;
  missing?: undefined;
}

export default function Rpc(props: Props) {
  const [out, setOut] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setOut((o) => ({ ...o, [k]: v }));
  const { onCompute } = props;
  const [computeIdentityChanges, setChanges] = useState(0);
  // oxlint-disable-next-line react/set-state-in-effect -- counts committed identity changes of the function prop
  useEffect(() => setChanges((n) => n + 1), [onCompute]);
  return (
    <div style={{ fontFamily: "monospace" }}>
      <div data-probe="count">{String(props.count)}</div>
      <div data-probe="date">
        {props.when instanceof Date ? props.when.toISOString() : "not a date"}
      </div>
      <div data-probe="map">
        {props.tags instanceof Map
          ? [...props.tags].map(([k, v]) => `${k}=${v}`).join(",")
          : "not a map"}
      </div>
      <div data-probe="has-missing">{String("missing" in props)}</div>
      <div data-probe="identity">{computeIdentityChanges}</div>
      <button
        data-probe="compute"
        onClick={() =>
          props.onCompute?.(2, 3).then((r) => set("compute", String(r)))
        }
      >
        compute
      </button>
      <button
        data-probe="fail"
        onClick={() =>
          props
            .onFail?.()
            .catch((e: Error) => set("fail", `${e.name}:${e.message}`))
        }
      >
        fail
      </button>
      <button
        data-probe="nested"
        onClick={() =>
          props.nested?.deep.fn?.(21).then((r) => set("nested", String(r)))
        }
      >
        nested
      </button>
      <button
        data-probe="bad-arg"
        onClick={() =>
          props
            .onCompute?.((() => 1) as unknown as number, 1)
            .catch((e: Error & { code?: string }) =>
              set("bad-arg", String(e.code)),
            )
        }
      >
        bad arg
      </button>
      <div data-probe="out">{JSON.stringify(out)}</div>
    </div>
  );
}
