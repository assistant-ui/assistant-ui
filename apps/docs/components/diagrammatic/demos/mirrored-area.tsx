import { MirroredArea } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Router throughput over one day: download above, upload below",
    note: "The two directions share one clock; evening streaming dominates the top half.",
    chart: (
      <MirroredArea
        title="Router throughput over one day"
        down={{ name: "download", data: [18, 30, 26, 40, 36, 48, 42, 52] }}
        up={{ name: "upload", data: [8, 12, 10, 16, 14, 18, 22, 16] }}
        labels={["00", "03", "06", "09", "12", "15", "18", "21"]}
      />
    ),
  },
  {
    title: "Hiring against attrition, eight quarters",
    note: "Joins outrun leaves every quarter except the fifth, where the halves nearly touch.",
    chart: (
      <MirroredArea
        title="Hiring against attrition"
        down={{ name: "joined", data: [12, 15, 18, 14, 9, 16, 20, 22] }}
        up={{ name: "left", data: [4, 5, 6, 7, 8, 6, 5, 6] }}
        labels={["Q1", "Q2", "Q3", "Q4", "Q1", "Q2", "Q3", "Q4"]}
      />
    ),
  },
  {
    title: "Reservoir inflow and release through a wet season",
    note: "Inflow peaks two months before releases do; the lag is the stored water.",
    chart: (
      <MirroredArea
        title="Reservoir inflow and release"
        down={{ name: "inflow", data: [22, 38, 54, 62, 48, 30, 18, 12] }}
        up={{ name: "release", data: [14, 16, 24, 38, 46, 40, 28, 18] }}
        labels={["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
      />
    ),
  },
];
