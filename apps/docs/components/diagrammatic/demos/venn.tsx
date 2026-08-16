import { Venn } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Report, Slide } from "./scenes";

export const glyph = (
  <Venn
    title="Web and app users"
    a={{ label: "web only", value: 4200 }}
    b={{ label: "app only", value: 3100 }}
    overlap={1300}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Web and app users",
    setup:
      "A product team debates whether web and app are 'the same users on two surfaces' or two audiences. Two circles, three honest numbers, and the debate has a referee.",
    read: "The overlap is 1,300 of 8,600 — fifteen percent. These are mostly two audiences, and the roadmap's 'seamless cross-device sync' pitch just met the population it actually serves. The circles are sized to their counts; the geometry is the finding.",
    chart: (
      <AppCard title="Web × app" meta="8.6k users">
        <Venn
          title="Web and app users"
          a={{ label: "web only", value: 4200 }}
          b={{ label: "app only", value: 3100 }}
          overlap={1300}
        />
      </AppCard>
    ),
  },
  {
    title: "Dog people and cat people, one office",
    setup:
      "The office survey that settles the pet argument: who identifies as a dog person, a cat person, or — the option the argument forgot — both.",
    read: "The overlap is bigger than either camp expected: seventeen people refuse the binary entirely. The survey ended an argument by revealing the false premise, which is the venn diagram's oldest job.",
    chart: (
      <Slide title="Dogs, cats, both" footer="office survey">
        <Venn
          title="Pets in the office"
          a={{ label: "dog people", value: 38 }}
          b={{ label: "cat people", value: 29 }}
          overlap={17}
        />
      </Slide>
    ),
  },
  {
    title: "Newsletter and podcast audiences",
    setup:
      "A media brand assumed its podcast and newsletter shared one loyal audience, until the subscriber match ran and the circles came back nearly disjoint.",
    read: "The podcast barely shares readers with the newsletter — 2,100 of 28,000. Two audiences, one brand: cross-promotion is not preaching to the choir here, it is the single cheapest growth lever the company owns.",
    chart: (
      <Report title="Audience overlap" chip="subscriber match">
        <Venn
          title="Audience overlap"
          a={{ label: "newsletter", value: 18_400 }}
          b={{ label: "podcast", value: 9_600 }}
          overlap={2_100}
        />
      </Report>
    ),
  },
];
