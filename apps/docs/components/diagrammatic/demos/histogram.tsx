import { Histogram } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "API response times, one day of requests",
    setup:
      "The ops channel lights up every time checkout feels slow, so an SRE dumps a day of requests and buckets them by response time. The average says 420ms and explains nothing; the shape is the actual answer.",
    read: "Most requests land near 400ms, but the long right tail is where the pages come from: a few hundred requests living past 700ms. The dashed median line keeps the tail honest; without it the outliers would set the story.",
    chart: (
      <Histogram
        title="API response times"
        bins={[6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5]}
        marker={{ at: 6.9, label: "median 392ms" }}
        labels={["0", "200ms", "400ms", "600ms", "800ms"]}
      />
    ),
  },
  {
    title: "Final exam scores, one cohort",
    setup:
      "A professor grades 240 finals and the registrar asks for the usual summary. Instead of a mean, she bins the scores, because this course has a reputation for splitting the room.",
    read: "There it is: a healthy hump in the 70s and a second shoulder below the pass mark. Two populations wearing one average; the students who stopped attending after midterms are a visible bump, not a footnote.",
    chart: (
      <Histogram
        title="Exam scores"
        bins={[2, 5, 9, 16, 12, 8, 14, 26, 38, 44, 36, 22, 10, 4]}
        marker={{ at: 5.5, label: "pass 55" }}
        labels={["0", "25", "50", "75", "100"]}
      />
    ),
  },
  {
    title: "Homes sold this year, by price",
    setup:
      "A first-time buyer keeps hearing the city's average price on the news and keeps failing to find anything near it. An agent pulls the year's closed sales and bins them by price instead.",
    read: "Skewed hard to the right, as prices always are: the median sits at $412k while a thin tail of million-dollar sales drags the mean far above most transactions. The buyer's budget is normal; the average was the outlier.",
    chart: (
      <Histogram
        title="Sale prices"
        bins={[8, 24, 52, 74, 68, 50, 34, 22, 14, 9, 6, 4, 2, 1]}
        marker={{ at: 3.4, label: "median $412k" }}
        labels={["$200k", "$400k", "$600k", "$800k", "$1m"]}
      />
    ),
  },
  {
    title: "The smooth variant: marathon finish times",
    setup:
      "Passing `smooth` trades the bars for a curve: the same bins, read as a density. A race director plots twelve thousand finish times to place the water stations and the photographers.",
    read: "The curve peaks just before 4:00 and there is a visible bump right below it: everyone sprinting to beat the round number. A histogram shows the same thing in steps; the density makes the goal-time bulge unmistakable.",
    chart: (
      <Histogram
        smooth
        title="Marathon finish times"
        bins={[2, 6, 14, 30, 52, 74, 88, 92, 80, 60, 46, 38, 30, 20, 10, 4]}
        marker={{ at: 6.7, label: "median 3:58" }}
        labels={["2:30", "3:30", "4:30", "5:30"]}
      />
    ),
  },
  {
    title: "The smooth variant: two commutes in one city",
    setup:
      "A transit agency surveys door-to-desk commute times and the histogram looks lumpy. Smoothing it reveals why: the city does not have one commute, it has two.",
    read: "Two humps, one near 25 minutes and one near 55, with a valley between. The transit crowd and the drivers never meet in the middle, and any single 'average commute' quoted from this data describes almost nobody.",
    chart: (
      <Histogram
        smooth
        title="Commute times"
        bins={[4, 18, 42, 58, 46, 24, 14, 12, 22, 40, 52, 44, 26, 12, 5, 2]}
        marker={{ at: 7.2, label: "median 41 min" }}
        labels={["10", "30", "50", "70", "90 min"]}
      />
    ),
  },
];
