# TODO — review findings for `us_income_tax_rates_1862-2025_1.html`

From a code review on 2026-08-21, before any further feature work. Every item
below was **observed**, not inferred: the page was booted under jsdom with a
stubbed Chart.js and driven through its interactions. Line numbers refer to
`us_income_tax_rates_1862-2025_1.html` as of commit `7fd7139`.

**All findings are now closed** (2026-08-21): #1–#7 and #9–#13 fixed, #8 closed
as a decision with no code change. Nothing outstanding.

## Suggested order

1. ~~**Bugs** (#1, #2)~~ — done.
2. ~~**#3 (pretty-print the JSON)**~~ — done.
3. ~~**#5 (consolidate status metadata)**~~ — done, together with its companion
   #6. The annotations feature is now unblocked.
4. ~~#4, #7, #9~~ — done, along with ~~#10, #11, #12~~. Nothing left.

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

### 8. Exports ignore the active filters — **CLOSED, working as intended**

`exportCSV` / `exportJSON` always emit the full dataset regardless of the current
year range, filing status, or search query. This may well be intended ("export
the whole thing"), but it's the kind of mismatch users report as a bug.

**Decision (2026-08-21, owner):** leave as-is. The exports are meant to hand
over the whole dataset, not the current view. No code change. If this resurfaces
as user confusion, the cheap fix is wording on the button rather than
filter-aware exports.

### 9. No SRI hash on the Chart.js CDN tag — **FIXED**

**Where:** line 10. Add `integrity` + `crossorigin` to pin the delivered file.

**Fix (applied):** the tag now carries the sha384 digest below, plus
`crossorigin="anonymous"` (required — without CORS the browser cannot read the
response well enough to verify it) and `referrerpolicy="no-referrer"`. `npm test`
asserts the tag keeps its integrity and crossorigin attributes and stays pinned
to the version the hash was computed from.

The hash was verified before use — computed from a fresh download of
`https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js` (205,125
bytes, banner reads `Chart.js v4.4.1`) and confirmed byte-identical to the value
cdnjs publishes at `api.cdnjs.com/libraries/Chart.js/4.4.1?fields=sri`:

```
sha384-dug+JxfBvklEQdJ4AYuBBAIScUz0bVN73xpy273gcAwHjb3qI0fXmuYNaNfdyYJG
sha512-ZwR1/gSZM3ai6vCdI+LVF1zSq/5HznD3ZSTk7kajkaj4D292NLuduDCO1c/NT8Id+jE58KYLKT7hXnbtryGmMg==
```

Either digest is fine; SRI accepts one or several. The tag becomes:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"
        integrity="sha384-dug+JxfBvklEQdJ4AYuBBAIScUz0bVN73xpy273gcAwHjb3qI0fXmuYNaNfdyYJG"
        crossorigin="anonymous"></script>
```

Note the interaction with #2: a failed integrity check means the browser refuses
to execute the file, so `Chart` is undefined — which is exactly the case
`syncChart()` already handles. The page degrades to the offline placeholder
rather than breaking. **If the pinned version is ever bumped, the hash must be
recomputed or the chart silently stops loading.**

---

## Accessibility

### 10. `<tr role="button">` breaks table semantics — **FIXED**

**Where:** line 444 — ledger rows carry `role="button"` and `tabindex="0"`.

Overriding the row role means assistive tech loses the row/cell relationship for
the entire ledger.

**Fix (applied):** `role` and `tabindex` are gone from the `<tr>`. The `.expand`
control in the first cell is now a real, focusable button carrying the
accessible name (`View the 1944 bracket schedule`); it was previously
`tabindex="-1" aria-hidden="true"`, i.e. deliberately hidden. Native button
activation covers Enter and Space, so the row `keydown` shim was deleted; the
row click survives as a mouse convenience. Added a `:focus-visible` outline for
the button.

### 11. No focus trap in the modal — **FIXED**

Tab moves focus to the page behind the open dialog, and the background isn't
`inert`. Escape handling and focus restore are already correct, so this is the
only remaining gap.

**Fix (applied):** `openModal` sets `inert` + `aria-hidden="true"` on every body
child except the dialog, and `modalKeydown` (which replaces `escClose`, keeping
its Escape behaviour) wraps Tab and Shift+Tab within the dialog and pulls back
focus that has escaped. `inert` alone would do it in current browsers; the
explicit wrap is the fallback for those without support. `closeModal` lifts both
attributes *before* restoring focus, since focus cannot land on an inert
element.

### 12. The rows-per-page `<select>` loses focus on change — **FIXED**

**Where:** `perSelect()` (469) is re-rendered as part of `renderPager`, so the
element a keyboard user just interacted with is replaced.

**Fix (applied):** took the first option — `perSelect()` is deleted and the
select is plain markup inside `#pager`. `renderPager` re-renders only the new
`#pager-nav` wrapper and syncs `#per`'s value, so the element is never replaced
and focus survives. The `<label>` gained a `for` attribute while it was open.

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

**Follow-up (same day):** added `a11y.js` / `npm run a11y`, which drives real
headless Chrome for what jsdom cannot reach — the computed accessibility tree,
axe-core, native Tab order, real `inert` enforcement, actual text overflow in
the note column, and whether the SRI-pinned Chart.js loads over `file://`. It
found two things `test.js` had passed: the dialog announced as bare "1862", and
then as all-caps once labelled from the kicker. Both fixed. `puppeteer` is
pinned to 23.x for the same Node 18 reason as jsdom.

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
