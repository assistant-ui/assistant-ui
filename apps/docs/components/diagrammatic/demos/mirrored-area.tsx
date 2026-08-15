import { MirroredArea } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Router throughput over one day",
    setup:
      "A home-lab owner graphs the router's counters: download above the axis, upload below, one day in three-hour steps. Two directions of one pipe, sharing one clock.",
    read: "Evening streaming dominates the top half while upload stays a modest band — until the 21h upload bump, which is the night the backup job runs. The two halves share a scale by convention; label both directions or one will get misread.",
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
    setup:
      "A people team plots joins above the axis and leaves below it, because net headcount alone hides the churn underneath. Eight quarters of both flows.",
    read: "Joins outrun leaves in every quarter except the fifth, where the halves nearly touch — the hiring freeze meeting attrition head-on. The gap between the halves is net growth, and watching it breathe tells the real staffing story.",
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
    setup:
      "A dam operator's season chart: river inflow above the axis, controlled releases below, November through June. The mirror form fits because the two flows literally oppose each other.",
    read: "Inflow peaks two months before releases do, and the lag is the point: that offset is the stored water doing its job. If the two halves ever peak together, the reservoir has stopped buffering and started merely passing water through.",
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
