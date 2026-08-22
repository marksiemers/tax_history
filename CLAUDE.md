# CLAUDE.md — U.S. Income Tax History Visualizer

Context and working notes for Claude Code agents. Read this before editing anything.

## What this project is

A single, self-contained interactive web page charting U.S. federal individual
income tax rates and brackets across all 164 years from **1862 to 2025**. It is
built from a historical rates CSV plus a CPI series used to convert historical
dollar thresholds into present-day (2026) dollars.

The whole app — markup, CSS, data, and logic — lives in **one HTML file**. There
is no build step, no framework, and no server. Open the file in a browser and it
runs.

## Files

- `us_income_tax_rates_1862-2025_1.html` — **the deliverable.** ~624 lines. The
  entire application. This is the file you edit.
- `Historical Income Tax Rates and Brackets 1862-2025.csv` — the original source
  data (2,533 rows: one row per bracket per filing status per year). Note the
  spaces in the filename — quote it in shell commands. The HTML's embedded JSON
  was derived from this. Treat the CSV as the upstream source of truth for
  rates/brackets; the HTML's JSON is a processed copy. The CSV covers 163
  distinct years, while the JSON has 164 year objects: the JSON carries explicit
  `hasTax: false` placeholders for the no-tax gap years, which the CSV simply
  omits.
- `tax_rate_annotations.md` — a researched writeup of the historical context behind every
  significant rate change (wars, major Revenue Acts, Reagan/TRA-86, TCJA, etc.),
  with an "after-effects" note for each and a shortlist of six "headline"
  annotations. **Not yet integrated into the chart.** See "Roadmap" below.
- `TODO.md` — outstanding review findings (structural, polish, and accessibility
  work; the two confirmed bugs are now fixed). **Read it before editing the
  HTML** — it has a suggested ordering, and two items are best done before other
  work lands.
- `test.js` — the verification harness (see "How to verify a change"). Boots the
  page under jsdom, with and without Chart.js, and drives the interactions.
  Run it with `npm test`; `package.json` exists only for that.

## Architecture of the HTML file

Rough top-to-bottom layout:

1. `<head>` — Google Fonts (Fraunces, Inter, Spline Sans Mono) and **Chart.js
   4.4.1 from a CDN**. Chart.js is the only external runtime dependency.
2. `<style>` — all CSS, driven by CSS custom properties (design tokens) declared
   in `:root`. Newspaper/ledger aesthetic.
3. Markup — masthead, a controls bar, a summary stat strip, the chart, the
   ledger table, a per-year bracket-detail modal, and a footer.
4. `<script id="taxdata" type="application/json">…</script>` (around line 271) —
   the entire dataset. It is **pretty-printed on purpose**: one line per year
   object, and within a year one line per filing status. That keeps a data edit
   readable as a diff — a changed bracket shows up as a single line naming both
   the year and the status. Don't re-minify it.
5. A final `<script>` (the last `<script>` tag in the file) — all the app logic:
   parses the JSON, renders the chart and table, and wires up every control.

### How the file was originally generated

The page was built from a template with a `__DATA__` placeholder, and the JSON
was injected via a small Python step to avoid escaping issues. You do **not**
need to reproduce that pipeline to make edits — edit the HTML directly. Just be
aware the committed file is the fully-assembled output, and the `<script
id="taxdata">` block is where the data lives inline.

## Data shape

The embedded JSON is:

```
{
  "meta": {
    "cpiNow": 1004.8,
    "cpiBaseYear": 2026,
    "cpiSource": "Federal Reserve Bank of Minneapolis (CPI, 1967=100 base; pre-1913 estimated)",
    "taxSource": "Tax Foundation / IRS historical rates, 1862-2025",
    "minYear": 1862,
    "maxYear": 2025
  },
  "years": [
    {
      "year": 1913,
      "hasTax": true,          // false for 1873–1893, 1895–1912 (no federal income tax)
      "note": "…governing law / caveats…",
      "cpi": 29.7,
      "mult": 33.832,          // multiplier: historical $ × mult ≈ 2026 $
      "statuses": {
        "mfj":    { … },       // married filing jointly
        "mfs":    { … },       // married filing separately
        "single": { … },
        "hoh":    { … }        // head of household
      }
    },
    …
  ]
}
```

Each status object:

```
{
  "topRate": 7.0,             // %
  "bottomRate": 1.0,          // %
  "topThreshold": 500000,     // $ (nominal, historical) where the top bracket starts
  "topThresholdReal": 16915825, // $ in 2026 dollars (topThreshold × mult)
  "numBrackets": 7,
  "brackets": [ { "rate": 1.0, "threshold": 0 }, … ]  // full schedule, ascending
}
```

For no-tax years, `hasTax` is `false` and `statuses` is `{}`.

**If you change rate/bracket data:** update the CSV *and* the embedded JSON
together (the JSON is pretty-printed, so this is a reviewable diff — keep it
that way), and recompute `topThresholdReal` (= `topThreshold` × `mult`) so nominal
and real dollars stay consistent. The `mult`/`cpi` values are price-level only;
pre-1913 CPI figures are historical reconstructions and are illustrative, not
exact — keep the footer caveat if you touch this.

## Features (and the DOM hooks that drive them)

- **Chart** (`#chart`, Chart.js canvas) with two metrics toggled via `#metric`:
  (a) top & bottom marginal rate by year, and (b) where the top bracket *begins*,
  in 2026 dollars, on a log scale. Shaded bands mark the no-income-tax stretch.
  The log axis labels a 1-3-10 sequence generated from the data (`LOG_TICKS`),
  not a hardcoded list — extend the data and the axis keeps labelling itself.
- **Filing-status selector** `#status` (mfj / single / mfs / hoh) — drives both
  chart and table.
- **Year-range slider** — dual inputs `#lo` / `#hi` with readouts `#lo-val` /
  `#hi-val`.
- **Summary stat strip** `#stats` — recomputes highs/lows for the current status
  and range.
- **Ledger table** `#tbody` — sortable (click a `<th>`; sort key is `data-k`,
  sort type comes from the `COLUMNS` table in the script, not the markup),
  filterable (search box matches year or law name),
  and paginated via `#pager` (page-size control `#per`, default 10, static in
  the markup; only `#pager-nav` is re-rendered) with a row counter `#count`.
- **Bracket-detail modal** `#modal` — clicking a table row opens the full bracket
  schedule for that year; filing status can be switched inside the modal.
  Entry point: `openModal(...)`.
- **Exports** — `#dl-csv` (one row per bracket per status, plus a 2026-dollar
  column) and `#dl-json` (the full nested dataset). Both run client-side.

Key JS names to know: `STATUSES`/`ST`/`ST_KEYS` (the filing-status table —
key, short label, long label, CSV display name, in canonical order), `COLUMNS`
(ledger column → sort type), `chartConfig(...)`/`syncChart(...)`,
`openModal(...)`,
`renderPager(...)`. The final script tag is self-contained; search it for these
names.

**The chart instance is built once per metric.** `syncChart()` is the only
entry point: it constructs a `Chart` when there isn't one or when
`state.metric` changed, and otherwise pushes fresh data into the live instance
via `updateChart()` + `chart.update('none')`. This matters because the
year-range sliders fire `input` continuously — a drag used to mean one destroy
and one construct per tick. If you add a control that changes what the chart
shows, route it through `syncChart()` and keep the rebuild path for metric
changes only. `npm test` asserts a 40-step drag builds nothing.

**`STATUSES` and `COLUMNS` are the single source of truth.** Every status label,
the canonical status order, and every column sort type is derived from them —
don't reintroduce a local copy. Two markup lists have to stay in step with
`STATUSES` and `COLUMNS`: the `#status` buttons (`data-v`) and the ledger's
`<th data-k>` set. `npm test` asserts both agreements statically, so drift fails
the suite rather than surfacing as a subtly wrong label.

## Conventions / constraints

- **Keep it single-file and dependency-light.** The value of this artifact is
  that it's one portable HTML file. Don't introduce a bundler, npm packages, or a
  framework unless explicitly asked.
- **Chart.js is loaded from a CDN**, pinned by SRI hash, so the chart needs
  internet to draw. **Bumping the Chart.js version means recomputing the
  `integrity` hash** (cdnjs publishes it at
  `api.cdnjs.com/libraries/Chart.js/<version>?fields=sri`) — otherwise the
  browser refuses the file and the chart silently stops loading. `npm test`
  pins the expected version so a bump fails there first. The
  table, filtering, sorting, and exports all work fully offline. Preserve that
  split — don't make core table features depend on the network.
- **No browser storage** was used and none is needed.
- **Styling goes through the CSS variables** in `:root`. Reuse the existing
  tokens (e.g. `--ink`, `--oxblood`, `--pine`, `--paper`) rather than hardcoding
  new colors, and keep the three-font system.
- **Accessibility:** controls use `aria-*` attributes and roles; preserve them
  when editing markup. Three invariants are load-bearing and asserted by
  `npm test`:
  - **Ledger rows keep their native `<tr>` semantics.** The clickable control is
    the `.expand` `<button>` in the first cell, which carries the accessible
    name. Don't put `role="button"` or `tabindex` back on the row — that costs
    assistive tech the row/cell relationship for the whole table. The row click
    is a mouse convenience layered on top.
  - **The modal traps focus.** `openModal` marks every other body child `inert` +
    `aria-hidden`, and `modalKeydown` wraps Tab within the dialog. `closeModal`
    lifts both before restoring focus — order matters, since focus can't land on
    an inert element.
  - **The rows-per-page `<select>` is static markup, not generated.**
    `renderPager` re-renders only `#pager-nav` and syncs `#per`'s value.
    Rebuilding the select would destroy the element a keyboard user is holding.

## How to verify a change

```
npm install   # once — pulls jsdom, the only dev dependency
npm test
```

`test.js` does three things, and they are the workflow: it syntax-checks the
extracted app script, boots the whole page under jsdom to catch missing element
IDs and reference errors at init, then drives the interactive paths (sort,
filter, page size, paginate, open the modal, switch status inside it, close) and
asserts the DOM updated.

It boots the page **twice**: once with a stubbed Chart.js and once with no
`Chart` global, which is what an unreachable CDN looks like. The offline pass is
what enforces the "table works without the network" constraint below — if you
touch `render()` or `buildChart()`, that pass is the one to watch.

Run it after any JS change, and still open the file in a browser to eyeball the
chart itself, which the stub cannot check.

Note: `jsdom@22` is the last release that works on Node 18; newer ones are
ESM-only and fail with `ERR_REQUIRE_ESM`.

## Roadmap / open threads

- **Timeline annotations (planned, not done).** `tax_rate_annotations.md` has the
  researched content. The intended next step is to surface these as annotations
  on the chart — the six headline beats are: 1913 (16th Amendment), 1918 (WWI
  peak 77%), 1925 (Mellon low 25%), 1944 (all-time peak 94%), 1964–65
  (Kennedy–Johnson cut 91%→70%), 1988 (TRA-86 low, 2 brackets). The owner wanted
  to do more research before wiring these in, and asked that causal claims stay
  framed as "coincided with," not "caused."
- Possible extensions discussed: a second chart line comparing two filing
  statuses at once; a separate bracket-count line (50+ in 1918 → 2 in 1988 → 7
  today).
