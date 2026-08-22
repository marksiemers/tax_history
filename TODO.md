# TODO — review findings for `us_income_tax_rates_1862-2025_1.html`

From a code review on 2026-08-21, before any further feature work. Every item
below was **observed**, not inferred: the page was booted under jsdom with a
stubbed Chart.js and driven through its interactions. Line numbers refer to
`us_income_tax_rates_1862-2025_1.html` as of commit `7fd7139`.

**Fixed so far:** #1, #2, #3, #4, #5, #6, #7, and #13 (2026-08-21). Still
outstanding: #8, #9, #10, #11, #12.

## Suggested order

1. ~~**Bugs** (#1, #2)~~ — done.
2. ~~**#3 (pretty-print the JSON)**~~ — done.
3. ~~**#5 (consolidate status metadata)**~~ — done, together with its companion
   #6. The annotations feature is now unblocked.
4. ~~#4, #7~~ — done. Still open: #8 (a decision), #9, and the accessibility
   items #10–#12.

---

## Bugs

### 1. Clicking a header in the bracket-detail modal crashes the page — **FIXED**

**Where:** line 583 (sort wiring), line 465 (`aria-sort` loop), line 434
(`tableRows`), modal headers at line 262.

The sort wiring selects headers document-wide:

```js
document.querySelectorAll('th').forEach(th=>th.addEventListener('click',...))
```

That also matches the four `<th>` in the modal's `table.brk`, which have no
`data-k`. Clicking one sets `state.sortK = undefined`; `tableRows()` then
evaluates `document.querySelector('th[data-k="undefined"]').dataset.t` against a
null result:

```
TypeError: Cannot read properties of null (reading 'dataset')
  at tableRows  (app script line 165)
  at renderTable
```

The ledger is left frozen — every subsequent render throws as well. The same
root cause writes a meaningless `aria-sort="none"` onto all four modal headers
(confirmed present).

**Fix (applied):** both the click wiring and the `aria-sort` loop now select
`#table thead th` rather than bare `th`, so the modal's headers are untouched.

### 2. An unreachable Chart.js CDN kills the whole page, not just the chart — **FIXED**

**Where:** line 558 (`render()`), line 379 (`new Chart(...)`), line 10 (CDN tag).

`render()` runs `renderStats(); buildChart(); renderTable();` in that order.
`buildChart` throws `ReferenceError: Chart is not defined`, so `renderTable()`
never runs. Booted with no `Chart` global, the observed result is **5 stat cards,
0 table rows, 0 pager controls** — table, sorting, filtering, pagination, modal,
and both exports are all unreachable.

This contradicts a stated constraint in `CLAUDE.md`: *"The table, filtering,
sorting, and exports all work fully offline. Preserve that split — don't make
core table features depend on the network."* The invariant is documented but not
implemented.

**Fix (applied):** added `safeBuildChart()`, which returns early with a
`.chart-fallback` placeholder in `.chart-box` when the `Chart` global is missing,
and catches any error `buildChart()` throws otherwise. Both call sites
(`render()` and the metric toggle) go through it, so `renderTable()` always runs.
A `.chart-fallback` style was added next to `.chart-box`.

---

## Structure / maintainability

### 3. The 376 KB single-line JSON blob makes git diffs useless — **FIXED**

**Where:** line 269 — 375,984 characters on one line.

Any data change rewrites that single line, so diffs show "1 line changed" with no
visible detail, and concurrent edits conflict irreconcilably. Now that the
project is version-controlled this is the highest-value structural change.

**Fix (applied):** the blob is pretty-printed — one line per year object, and
within each year one line per filing status, so a changed bracket shows as a
single line naming both the year and the status. 1 line → 676; the file grew
3.9 KB (~1%). Verified as a pure reformat: the reparsed data compares equal to
the original including key order. `npm test` asserts it stays pretty-printed.

### 4. The chart is destroyed and rebuilt on every slider tick — **FIXED**

**Where:** line 581 (`lo`/`hi` listen on `input`), `syncRange` → `render()` →
`buildChart()` → `chart.destroy()` + `new Chart(...)` at 379.

`input` fires continuously during a drag. A simulated 40-step drag produced
**40 Chart constructions and 40 destroys**. On a real canvas this is the jankiest
interaction on the page.

**Fix (applied):** `chartConfig()` now returns just the labels and datasets,
separately from instance construction. `syncChart()` is the single entry point:
it builds a `Chart` only when there isn't one or when `state.metric` changed,
and otherwise assigns the new data onto the live instance and calls
`chart.update('none')`. A year-range drag or a filing-status change reuses the
instance. `npm test` replays a 40-step drag and asserts 0 builds and 0 destroys
(it was 40 and 40).

### 5. Filing-status metadata is duplicated in four places — **FIXED**

- `labelStatus()` (line 419) and `STLABEL` (line 495) are byte-identical maps.
- The order `['mfj','single','mfs','hoh']` is spelled out separately in
  `firstStatus` (497) and `renderModal` (~513).
- `exportCSV` (541) repeats it in a *different* order, with display names.

**Fix (applied):** one `STATUSES` array near the top of the script (key, short
label, long label, CSV display name, in the canonical UI order), plus the `ST`
lookup and `ST_KEYS` order derived from it. All four call sites now read from
it.

**Behaviour note:** `exportCSV` used to emit statuses in `mfj, mfs, single, hoh`
order; it now follows the canonical `mfj, single, mfs, hoh`. Verified that the
export still contains exactly the same 9,049 rows — only their order within a
year changed.

### 6. `tableRows()` reads its sort type out of the DOM — **FIXED**

**Where:** line 434 — `document.querySelector('th[data-k="'+k+'"]').dataset.t`.

Pulling config out of the DOM is what turned finding #1 from a harmless no-op
into a crash.

**Fix (applied):** a `COLUMNS` object (column key → `n`|`s`) next to `STATUSES`.
`tableRows()` reads the sort type from it, the sort handler ignores any header
whose `data-k` is not in it (so an unknown key can no longer poison the sort
state), and the now-dead `data-t` attributes are gone from the markup. `npm test`
asserts `COLUMNS` and the `<th data-k>` set stay in agreement.

---

## Correctness / polish

### 7. Log-axis tick labels vanish above $30M — **FIXED**

**Where:** line 399 — `const allowed=[1e4,3e4,1e5,3e5,1e6,3e6,1e7,3e7]`.

**32 status-years** have a `topThresholdReal` above `3e7`, ranging up to
**$120,479,616**. The top of the axis renders with no labels at all.

**Fix (applied):** took the second option — `LOG_TICKS` generates the 1-3-10
sequence from the actual data at load, spanning the smallest `topThresholdReal`
to the largest, so the axis now labels up to `$300M` and cannot silently fall
behind a data change again. `npm test` asserts the top labelled tick clears the
data maximum.

### 8. Exports ignore the active filters

`exportCSV` / `exportJSON` always emit the full dataset regardless of the current
year range, filing status, or search query. This may well be intended ("export
the whole thing"), but it's the kind of mismatch users report as a bug.

**Decision needed:** leave as-is, or export the current view? A second button, or
a note on the button, would also resolve it.

### 9. No SRI hash on the Chart.js CDN tag

**Where:** line 10. Add `integrity` + `crossorigin` to pin the delivered file.

---

## Accessibility

### 10. `<tr role="button">` breaks table semantics

**Where:** line 444 — ledger rows carry `role="button"` and `tabindex="0"`.

Overriding the row role means assistive tech loses the row/cell relationship for
the entire ledger. **Fix:** move the button role into the first cell (the
`.expand` control already there) and drop it from the `<tr>`, keeping the row
click as a convenience.

### 11. No focus trap in the modal

Tab moves focus to the page behind the open dialog, and the background isn't
`inert`. Escape handling and focus restore are already correct, so this is the
only remaining gap.

### 12. The rows-per-page `<select>` loses focus on change

**Where:** `perSelect()` (469) is re-rendered as part of `renderPager`, so the
element a keyboard user just interacted with is replaced. **Fix:** build the
select once and update only its value, or restore focus after render.

---

## Testing

### 13. Commit the jsdom harness — **FIXED**

The review used a throwaway jsdom harness that caught findings #1 and #2. It
matches the verification workflow already described in `CLAUDE.md` ("How to
verify a change", steps 1–3) but which has no committed implementation.

**Fix (applied):** `test.js`, run via `npm test`. It syntax-checks the app
script, boots the page under jsdom both with a stubbed Chart.js and with no
`Chart` global, and exercises sort / filter / page size / paginate / open modal /
switch status / close. Confirmed non-vacuous: against the pre-fix page it
reports 11 failures, reproducing both #1 and #2. `package.json` carries the lone
dev dependency (`jsdom@22` — the last version that works on Node 18; newer
releases are ESM-only and fail with `ERR_REQUIRE_ESM`).

---

## Not a problem — deliberately keep

Recorded so a future pass doesn't "fix" them:

- `esc()` is applied consistently to notes, the only user-visible free text.
  There's no injection path.
- All handlers use event delegation, so re-rendering the tbody never leaks
  listeners.
- The CSS custom-property token system is applied consistently.
- CSV export quoting (`csv()`) correctly handles commas, quotes, and newlines.
- Escape-to-close and focus-restore in the modal are correct.
