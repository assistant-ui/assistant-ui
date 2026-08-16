# Diagrammatic ceiling bar

This is the acceptance bar for a published figure on `/diagrammatic`. The wall of plates is a vocabulary. A detail page is a publication. Those are different jobs, and they no longer share one density or one definition of done.

A form is lifted when its first figure would sit next to the exemplars in a Cognition or OpenCode post without looking like a component gallery. Coverage (a story paragraph, a tooltip, a `Report` chrome) is not the bar.

## Exemplars

These three first figures are the contract. They are not finished publications; they are the highest the catalog currently reaches, and every lift is judged against them.

| Form | Figure | Why it is the bar |
|---|---|---|
| Line | Mean response length by training recipe | One frame carries three series, a regime band, and an argument. This is the SWE-1.7 job. |
| Column | FrontierBench 1.1 Main | Identity color on each entity, every value printed, a footnote that defines the metric. |
| Gauge | The instrument cluster | Composition of three dials, not a new component. Ticks, redline, needle and arc together. |

Known gaps on the exemplars themselves (do not copy these):

- Line still reads as a library card: axis type is too small, the region label is a whisper, there are no callouts on the curves.
- Column's identity colors still need a printed footnote defining FrontierBench.
- Gauge's nameplate defaults were sized for the wall, then patched. End tick labels had to be moved off the tick. The cluster is the figure.

## Surfaces

**Wall.** The index plate. Marks first. Text may hide (`TEXT_CHARTS` is the exception). The 200-wide viewBox and `TXT.axis` at 3.2 belong here.

**Figure.** The first example on the detail page. Article size. Type must read at the rendered width without a CSS rescue. The figure uses the form's hardest capability as data props (`series`, `regions`, `ticks`, `values`, `redline`, `needle`, `highlight`), not as demo-only markup.

Do not raise wall type to fix a figure. Do not shrink a figure to fit the wall.

## Reject checklist

A lift is rejected if any item fails.

1. **One argument without the caption.** Cover the title and the `read` paragraph. The figure still has to say what happened.
2. **The form's hardest move is in FIG 1.** Multi-series plus a region on Line. Values plus identity color on Column. A cluster of dials on Gauge. A second figure that only exists to show `step`, `inner`, `smooth`, or `normalized` is a teach shot and does not count.
3. **Enough data that cutting a third still looks like the same form.** Four pie slices, eight heatmap cells, or nine smooth points are a glyph, not a figure.
4. **Default type is readable at figure size.** If the demo needs `[&_text]:text-[…]` to make the nameplate or axis legitimate, the default is wrong.
5. **No classroom data.** `Q1 Q2 Q3`, `chrome / safari / edge`, sine-wave matrices, and "weekly npm downloads of react/vue/svelte" fail. The case has to be one a reader could steal.
6. **Chrome is invented for the case, or there is no chrome.** Five scenes (`Report`, `Terminal`, `Paper`, `AppCard`, `Slide`) reused as a theme pack fail the "not uniform" ask. A published chart can sit on the page with its own title, source line, and nothing else.
7. **One figure per form**, unless the form has two genuine jobs (a single dial versus an instrument cluster). An API variant is not a second job.

Micro forms (sparkline, sparkbar, win-loss, bullet, split-bar, progress-ring) use the same list at word size. Their figure is a row or a tile, not a poster.

## How a form is lifted

1. Lock the props FIG 1 needs on the form. If the ceiling case cannot be expressed as data, the API is not ready.
2. Rewrite FIG 1 against this file and the three exemplars. Delete teach figures.
3. Leave the wall glyph as a small marks-first plate.
4. Accept only when the reject list is empty.

Work one section at a time. Unlifted detail pages stay plates; they do not pretend to be publications.

## Score

Rescored 2026-08-16 after the remaining sections were rewritten against this file. Pictogram, radial bar, and strip plot stay in the package and are off the wall.

| Verdict | Meaning |
|---|---|
| exemplar | Pinned bar. Finish the known gaps when that form is next touched. |
| lifted | FIG 1 rewritten against this file. One figure, a stealable case, no scene pack. |
| fold | Not its own plate. Belongs as a story on another form. |

### Change over time

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 01 | Line | lifted | Training recipes with a regime band | FIG 1 only. Target envelope via `bands`. |
| 02 | Area | lifted | Monsoon in millimetres, core banded | Figure density. Paper chrome removed. |
| 03 | Stacked area | lifted | Grid mix across one day | 25 hourly samples. Terminal chrome removed. |
| 04 | Streamgraph | lifted | Traffic around the v2 launch | Launch week is the swell. Listening-genre costume replaced. |
| 05 | Mirrored area | lifted | Reservoir inflow and release | Figure density. Paper chrome removed. |
| 06 | Slope | lifted | Media time, 2020 against 2025 | Figure density. Paper chrome removed. |
| 07 | Bump | lifted | Premier League table, first ten matchweeks | Framework-rank costume replaced. |
| 08 | Candlestick | lifted | Coffee futures around a frost | Figure density. Paper chrome removed. |
| 09 | Horizon | lifted | Fleet load, eight hosts, one day | `series` rows. Single-band costume replaced. |
| 10 | Gantt | lifted | Release plan with today | Square bars. AppCard chrome removed. |

### Comparison

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 11 | Bar | lifted | Median minutes to ack, ten rotations | Ranked, SLO at 15m. Library leaderboard gone. |
| 12 | Column | exemplar | FrontierBench 1.1 | Keep FIG 1. |
| 13 | Grouped bar | lifted | Incidents by severity, six quarters | Three series, six groups. Medal table gone. |
| 14 | Stacked bar | lifted | Daily tokens by model, 49 days | Dense calendar. Normalized teach shot gone. |
| 15 | Lollipop | lifted | Hours to first review, twelve repos | Dense category list. Caffeine gone. |
| 16 | Dot plot | lifted | Median salary by role, with n | Scale ticks and sample size on the label. |
| 17 | Range bar | lifted | Closed offer bands | p25–p75 with a median tick. |
| 18 | Leaderboard | lifted | Top referrers, last 28 days | Ten rows including Other. |
| — | Pictogram | fold | Off the wall | Waffle already counts units. Package export kept. |
| — | Radial bar | fold | Off the wall | Progress ring and bar already do this. Package export kept. |
| 19 | Polar area | lifted | Trauma arrivals by hour | Twenty-four sectors. Nightingale job, not wind rose costume. |

### Part to whole

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 20 | Pie | lifted | FY25 cloud bill | Five slices, one dominant. No donut teach shot. |
| 21 | Waffle | lifted | Last 100 production deploys | Countable operational share. |
| 22 | Treemap | lifted | FY25 opex, three branches | Deep tree, fourteen leaves. |
| 23 | Sunburst | lifted | Where 10.4k weekly sessions go | Two-ring drill path. |
| 24 | Icicle | lifted | Checkout p95, 4.82s | Children sum to the handler. |
| 25 | Circle packing | lifted | Pages by service family | Membership plus size. |
| 26 | Marimekko | lifted | Cloud spend, region by vendor | NA × AWS is the annotated cell. |
| 27 | Funnel | lifted | Checkout, one Wednesday | Every stage labeled. Signup taper gone. |

### Distribution

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 28 | Histogram | lifted | Checkout POST, one Wednesday | Compare overlay is last week. `cumulative` is the running share. |
| 29 | Box plot | lifted | Tool calls per run, n=28 | Raw points kept. Three-panel teach shot folded into one job. |
| 30 | Violin | lifted | Hours to first review, four teams | n on the label. Bimodal legacy. |
| 31 | Ridgeline | lifted | San Francisco daily highs, 2024 | Twelve months. |
| 32 | Beeswarm | lifted | Every March PR | 78 points, 62h flagged. |
| — | Strip plot | fold | Off the wall | Beeswarm is the same job. Package export kept. |
| 33 | Population pyramid | lifted | Japan 2023 | Two named sides, ten-year bands. |

### Correlation and multivariate

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 34 | Scatter | lifted | SWE-bench against cost, sized by context | Named in the key. GDP costume gone. |
| 35 | Connected scatter | lifted | Score against cost, families as threads | reverseX and refPoint stay in FIG 1. |
| 36 | Hexbin | lifted | 3,100 Friday-night pickups | Two cores, empty cells kept. |
| 37 | Contour | lifted | Review hours against files | Rings labeled as σ levels in the source. |
| 38 | Heatmap | lifted | Commits by weekday and hour | Punchcard (`mark="dot"`). Calendar is the second job. |
| 39 | Quadrant | lifted | Q3 roadmap bets | Cuts land on 6 weeks and 50k WAU. |
| 40 | Parallel coordinates | lifted | Ten on-call weeks | Crossings are the outage. |
| 41 | Radar | lifted | Primary against secondary | Two profiles, axes ordered by burden. |

### Deviation

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 42 | Diverging bar | lifted | Revenue against plan | Sorted by value. |
| 43 | Diverging stacked | lifted | Would recommend, by team | Likert, n on the row, anchored on neutral. |
| 44 | Dumbbell | lifted | LCP before and after the image CDN | Checkout is the barbell that points the wrong way. |
| 45 | Difference area | lifted | Checkout POSTs against the Friday forecast | Shade flips the week of the sale. |

### Flow

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 46 | Sankey | lifted | 114 TWh, sources to uses | Two columns still. N-column via topology or `group`. |
| 47 | Chord | lifted | On-call handoffs, one quarter | Circular because the teams page each other. |
| 48 | Waterfall | lifted | ARR bridge, Q2 | Start, four signed steps, end. |

### Networks and hierarchy

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 49 | Network | lifted | Gateway in the middle | Highest-degree node is the one to find. |
| 50 | Arc diagram | lifted | packages/* imports in file order | Height is distance. |
| 51 | Tree | lifted | Engineering after the July reorg | Sixteen nodes. |
| 52 | Dendrogram | lifted | Support tickets, cut at 0.40 | Highlight is the last merge under the cut. |
| 53 | Venn | lifted | Web and iOS, last 28 days | All three regions numbered. |
| 54 | Upset | lifted | Incident tags last quarter | Combinations past two sets. |

### Spatial

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 55 | Choropleth | lifted | Checkout errors per 1k sessions | Rate, with a usable legend. |
| 56 | World map | lifted | Tokens per 1k weekly actives | Rate on real geography. Dotted variant gone. |
| 57 | Symbol map | lifted | PoPs sized by egress | Size legend on the figure. |
| 58 | Dot map | lifted | One dot = 50 weekly actives | Unit printed. |
| 59 | Flow map | lifted | Egress from iad-1 | Eight routes. |

### Micro

Judged at word or tile size.

| Plate | Form | Verdict | First figure | Note |
|---:|---|---|---|---|
| 60 | Sparkline | lifted | Host vitals in a sidebar | One figure. Composition lesson stays in copy. |
| 61 | Sparkbar | lifted | Deploys per day, last two weeks | Table rows. No density on the helper. |
| 62 | Win-loss | lifted | Arsenal, first eighteen league matches | Two named seasons. |
| 63 | Bullet | lifted | Revenue and NPS against target | Bands named poor / ok / good. |
| 64 | Progress ring | lifted | Ship, this quarter | One ring. |
| 65 | Gauge | exemplar | Instrument cluster | Keep the cluster as FIG 1. |
| 66 | Split bar | lifted | Cache hits against origin errors | Three real links. |

## Counts

| Verdict | Forms |
|---|---:|
| exemplar | 2 (Column, Gauge) |
| lifted | 64 |
| fold (off the wall, still exported) | 3 (pictogram, radial bar, strip plot) |

The wall now holds 66 plates. Line is lifted and still the Change-over-time exemplar in spirit; Column and Gauge remain the pinned bar for comparison and instruments. `SmallMultiples` is a layout export, not a plate.
