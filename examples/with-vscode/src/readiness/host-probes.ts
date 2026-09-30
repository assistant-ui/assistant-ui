import type { ProbeId } from "./probes";
import type { HostProbe } from "./runner";

export const HOST_PROBES: Partial<Record<ProbeId, HostProbe>> = {};
