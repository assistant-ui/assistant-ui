import { Venn } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Web and app users",
    note: "Two circles, three honest numbers; the overlap is the multi-platform cohort.",
    chart: (
      <Venn
        title="Web and app users"
        a={{ label: "web only", value: 4200 }}
        b={{ label: "app only", value: 3100 }}
        overlap={1300}
      />
    ),
  },
  {
    title: "Dog people and cat people, one office",
    note: "The overlap is bigger than either camp expected; the survey ended an argument.",
    chart: (
      <Venn
        title="Pets in the office"
        a={{ label: "dog people", value: 38 }}
        b={{ label: "cat people", value: 29 }}
        overlap={17}
      />
    ),
  },
  {
    title: "Newsletter and podcast audiences",
    note: "The podcast barely shares readers with the newsletter; two audiences, one brand.",
    chart: (
      <Venn
        title="Audience overlap"
        a={{ label: "newsletter", value: 18_400 }}
        b={{ label: "podcast", value: 9_600 }}
        overlap={2_100}
      />
    ),
  },
];
