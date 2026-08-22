#!/usr/bin/env node
/*
 * Verification harness for us_income_tax_rates_1862-2025_1.html.
 *
 * Implements the workflow described in CLAUDE.md ("How to verify a change"):
 *   1. extract the app script and syntax-check it
 *   2. boot the whole page under jsdom to catch missing IDs / reference errors
 *   3. drive the interactive paths (sort, paginate, page size, modal) and assert
 *
 * The page is booted twice: once with a stubbed Chart.js and once with no Chart
 * global at all, which is what an unreachable CDN looks like. The offline pass
 * enforces the CLAUDE.md invariant that the table, filtering, sorting, and
 * exports never depend on the network.
 *
 * Requires jsdom. Note that jsdom@22 is the last release that works on Node 18;
 * newer ones are ESM-only and fail with ERR_REQUIRE_ESM.
 *
 *   npm install && npm test
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PAGE = path.join(__dirname, 'us_income_tax_rates_1862-2025_1.html');
const src = fs.readFileSync(PAGE, 'utf8');

let failures = 0;
let group = '';
function section(name) { group = name; console.log('\n' + name); }
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) failures++;
}

/* ---------- step 1: extract + syntax-check the app script ---------- */

function appScript() {
  const re = /<script(?![^>]*\bsrc=)(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g;
  const found = [...src.matchAll(re)];
  if (!found.length) throw new Error('no inline app script found in ' + PAGE);
  return found[found.length - 1][1];
}

const APP = appScript();

section('script syntax');
try {
  new (require('vm').Script)(APP, { filename: 'app.js' });
  ok(true, 'app script parses');
} catch (e) {
  ok(false, 'app script parses (' + e.message + ')');
}

/* ---------- step 2: boot the page ---------- */

// Chart.js never runs here, so the canvas only needs to absorb the calls the
// band plugin makes while drawing the no-income-tax shading.
function stubCanvas(window) {
  window.HTMLCanvasElement.prototype.getContext = () => ({
    save() {}, restore() {}, fillRect() {}, fillText() {},
    translate() {}, rotate() {},
    measureText: () => ({ width: 10 }),
    set fillStyle(v) {}, set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
  });
}

function chartStub() {
  class Chart {
    constructor(canvas, config) {
      Chart.built++;
      Chart.last = this;
      this.canvas = canvas;
      this.config = config;
      this.data = config.data;
      this.options = config.options;
      this.chartArea = { left: 0, right: 100, top: 0, bottom: 100 };
      this.scales = { x: { getPixelForValue: () => 0 } };
      this.ctx = canvas.getContext('2d');
    }
    destroy() { Chart.destroyed++; }
    update() { Chart.updated++; }
  }
  Chart.built = 0; Chart.destroyed = 0; Chart.updated = 0; Chart.last = null;
  return Chart;
}

function boot({ withChart }) {
  const errors = [];
  const dom = new JSDOM(src, { runScripts: 'outside-only', pretendToBeVisual: true });
  const window = dom.window;
  stubCanvas(window);
  if (withChart) window.Chart = chartStub();
  window.addEventListener('error', e => errors.push(e.error || e.message));
  try { window.eval(APP); } catch (e) { errors.push(e); }
  return { window, document: window.document, errors };
}

const clean = errors => errors.length === 0;
const why = errors => errors.map(String).join('; ');
const rows = document => document.querySelectorAll('#tbody tr').length;

function click(window, el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}
function fire(window, el, type) {
  el.dispatchEvent(new window.Event(type, { bubbles: true }));
}

/* ---------- static invariants: markup and config must not drift apart ---------- */

section('Chart.js CDN tag');
{
  // Pinned deliberately. Changing the version means recomputing the SRI hash
  // (cdnjs publishes it at api.cdnjs.com/libraries/Chart.js/<v>?fields=sri);
  // this constant exists so a bump fails here instead of silently shipping a
  // stale hash, which would stop the chart loading with no other symptom.
  const CHART_VERSION = '4.4.1';
  const tag = src.match(/<script[^>]*cdnjs[^>]*><\/script>/);
  ok(!!tag, 'Chart.js is loaded from the CDN');
  const t = tag ? tag[0] : '';
  ok(t.includes('/Chart.js/' + CHART_VERSION + '/chart.umd.js'),
     'pinned to Chart.js ' + CHART_VERSION + ' (recompute the SRI hash if you bump this)');
  ok(/integrity="sha(256|384|512)-[A-Za-z0-9+/=]+"/.test(t), 'tag carries an SRI integrity hash');
  ok(/crossorigin="anonymous"/.test(t), 'tag sets crossorigin, without which SRI cannot verify');
}

section('embedded data');
{
  const blob = src.match(/<script id="taxdata" type="application\/json">([\s\S]*?)<\/script>/);
  ok(!!blob, 'taxdata block is present');
  let data = null;
  try { data = JSON.parse(blob[1]); ok(true, 'taxdata parses as JSON'); }
  catch (e) { ok(false, 'taxdata parses as JSON (' + e.message + ')'); }
  if (data) {
    ok(data.years.length === 164, 'covers 164 years (' + data.years.length + ')');
    const lines = blob[1].trim().split('\n').length;
    // Finding #3: a one-line blob makes every data diff unreviewable.
    ok(lines > 100, 'taxdata is pretty-printed, not one line (' + lines + ' lines)');
    const bad = data.years.filter(y => y.hasTax && Object.keys(y.statuses).length === 0);
    ok(bad.length === 0, 'every hasTax year carries statuses (' + bad.length + ' bad)');
    const gap = data.years.filter(y => !y.hasTax);
    ok(gap.length > 0 && gap.every(y => Object.keys(y.statuses).length === 0), 'no-tax years carry no statuses');
  }
}

section('config / markup agreement');
{
  // Finding #6: sort types used to be read out of the DOM. COLUMNS owns them
  // now, so the two lists must still name the same columns.
  const cols = APP.match(/const COLUMNS = \{([\s\S]*?)\};/);
  ok(!!cols, 'COLUMNS table is declared');
  const colKeys = cols ? [...cols[1].matchAll(/(\w+)\s*:/g)].map(m => m[1]).sort() : [];
  const headKeys = [...src.matchAll(/<th data-k="(\w+)"/g)].map(m => m[1]).sort();
  ok(headKeys.length === 7, 'ledger declares 7 sortable headers (' + headKeys.length + ')');
  ok(JSON.stringify(colKeys) === JSON.stringify(headKeys),
     'COLUMNS matches the ledger headers (' + colKeys.join(',') + ' vs ' + headKeys.join(',') + ')');
  ok(!/<th[^>]*data-t=/.test(src), 'no stale data-t attributes left in the markup');

  // Finding #5: the filing-status list used to exist in four places.
  const sts = APP.match(/const STATUSES = \[([\s\S]*?)\];/);
  ok(!!sts, 'STATUSES table is declared');
  const stKeys = sts ? [...sts[1].matchAll(/key:'(\w+)'/g)].map(m => m[1]) : [];
  // scope to the #status group -- the metric toggle uses data-v too
  const stGroup = src.match(/<div class="segmented" id="status"[\s\S]*?<\/div>/)[0];
  const btnKeys = [...stGroup.matchAll(/<button data-v="(\w+)"/g)].map(m => m[1]);
  ok(JSON.stringify(stKeys) === JSON.stringify(btnKeys),
     'STATUSES order matches the selector buttons (' + stKeys.join(',') + ' vs ' + btnKeys.join(',') + ')');
  ok(!/\['mfj','single','mfs','hoh'\]/.test(APP), 'no hardcoded status-order array left in the script');
  ok((APP.match(/married filing jointly/g) || []).length === 1, 'the long status labels are spelled once');
}

/* ---------- offline: no Chart global, as when the CDN is unreachable ---------- */

section('offline (no Chart.js)');
{
  const { window, document, errors } = boot({ withChart: false });
  ok(clean(errors), 'page initialises without errors (' + why(errors) + ')');
  ok(rows(document) === 10, 'ledger renders the first page (' + rows(document) + ' rows, want 10)');
  ok(document.querySelectorAll('#pager button').length > 0, 'pager renders');
  ok(document.getElementById('stats').children.length > 0, 'stat strip renders');

  const fallback = document.querySelector('.chart-fallback');
  ok(!!fallback, 'chart placeholder replaces the canvas');
  ok(fallback && /Chart\.js/.test(fallback.textContent), 'placeholder explains the CDN dependency');

  let downloads = 0;
  window.URL.createObjectURL = () => { downloads++; return 'blob:test'; };
  window.URL.revokeObjectURL = () => {};
  click(window, document.getElementById('dl-csv'));
  click(window, document.getElementById('dl-json'));
  ok(downloads === 2, 'both exports run offline (' + downloads + ' of 2)');

  click(window, document.querySelector('#table thead th[data-k="topRate"]'));
  ok(rows(document) === 10, 'sorting works offline');

  document.getElementById('search').value = '1944';
  fire(window, document.getElementById('search'), 'input');
  ok(rows(document) === 1, 'filtering works offline (' + rows(document) + ' rows, want 1)');

  ok(clean(errors), 'no errors after offline interaction (' + why(errors) + ')');
}

/* ---------- online: Chart.js present ---------- */

section('online (Chart.js stubbed)');
{
  const { window, document, errors } = boot({ withChart: true });
  ok(clean(errors), 'page initialises without errors (' + why(errors) + ')');
  ok(window.Chart.built === 1, 'chart built once at init (' + window.Chart.built + ')');
  ok(!document.querySelector('.chart-fallback'), 'no placeholder when Chart.js is present');

  section('bracket-detail modal');
  click(window, document.querySelector('#tbody tr'));
  const modal = document.getElementById('modal');
  ok(modal.classList.contains('open') || modal.getAttribute('aria-hidden') === 'false', 'row click opens the modal');
  ok(document.querySelectorAll('#modal-body tr').length > 0, 'modal lists the bracket schedule');

  // Regression: the modal's headers have no data-k. Sort wiring scoped to the
  // whole document used to latch state.sortK to undefined and freeze the ledger.
  const modalTh = document.querySelector('#modal table.brk thead th');
  click(window, modalTh);
  ok(clean(errors), 'clicking a modal header does not throw (' + why(errors) + ')');
  ok(modalTh.getAttribute('aria-sort') === null, 'modal headers carry no aria-sort');

  const chips = document.querySelectorAll('#modal-chips button');
  ok(chips.length > 1, 'modal offers a filing-status switch');
  if (chips.length > 1) {
    click(window, chips[1]);
    ok(document.querySelectorAll('#modal-body tr').length > 0, 'modal repopulates after switching status');
  }
  click(window, document.getElementById('modal-close'));
  ok(clean(errors), 'modal closes cleanly (' + why(errors) + ')');

  section('ledger after the modal');
  document.getElementById('search').value = '1944';
  fire(window, document.getElementById('search'), 'input');
  ok(rows(document) === 1, 'ledger is not frozen (' + rows(document) + ' rows, want 1)');
  document.getElementById('search').value = '';
  fire(window, document.getElementById('search'), 'input');

  const th = document.querySelector('#table thead th[data-k="topRate"]');
  click(window, th);
  ok(th.getAttribute('aria-sort') === 'descending', 'header sort sets aria-sort (' + th.getAttribute('aria-sort') + ')');
  click(window, th);
  ok(th.getAttribute('aria-sort') === 'ascending', 'header sort toggles direction');

  section('pagination');
  const per = document.getElementById('per');
  per.value = '25';
  fire(window, per, 'change');
  ok(rows(document) === 25, 'page size applies (' + rows(document) + ' rows, want 25)');
  const first = document.querySelector('#tbody tr').textContent;
  click(window, document.querySelector('#pager button[data-pg="next"]'));
  ok(document.querySelector('#tbody tr').textContent !== first, 'next page shows different rows');
  click(window, document.querySelector('#pager button[data-pg="first"]'));
  ok(document.querySelector('#tbody tr').textContent === first, 'first page returns to the top');

  section('every status and column');
  // Each filing status must render, and each column must sort both ways
  // without throwing -- the sort type now comes from COLUMNS, not the DOM.
  document.querySelectorAll('#table thead th[data-k]').forEach(col => {
    click(window, col);
    click(window, col);
    ok(clean(errors) && rows(document) > 0,
       'sorting by ' + col.dataset.k + ' works (' + rows(document) + ' rows)');
  });
  document.querySelectorAll('#status button').forEach(btn => {
    click(window, btn);
    ok(clean(errors) && rows(document) > 0,
       'status ' + btn.dataset.v + ' renders (' + rows(document) + ' rows)');
  });

  section('chart reuse on slider drags');
  {
    // Finding #4: every `input` tick used to destroy and reconstruct the chart.
    // A drag must now mutate the live instance instead.
    const builtBefore = window.Chart.built, destroyedBefore = window.Chart.destroyed;
    const hi = document.getElementById('hi');
    for (let y = 2025; y > 1985; y--) { hi.value = String(y); fire(window, hi, 'input'); }
    ok(window.Chart.built === builtBefore,
       'a 40-step drag builds no new chart (' + (window.Chart.built - builtBefore) + ' builds)');
    ok(window.Chart.destroyed === destroyedBefore,
       'a 40-step drag destroys no chart (' + (window.Chart.destroyed - destroyedBefore) + ' destroys)');
    ok(window.Chart.updated >= 40, 'the live chart was updated instead (' + window.Chart.updated + ' updates)');
    ok(window.Chart.last.data.labels.length === 1986 - 1862 + 1,
       'chart data followed the range (' + window.Chart.last.data.labels.length + ' points, want 125)');

    // A filing-status change also reuses the instance.
    const b2 = window.Chart.built;
    click(window, document.querySelector('#status button[data-v="hoh"]'));
    ok(window.Chart.built === b2, 'changing filing status reuses the chart');

    hi.value = '2025'; fire(window, hi, 'input');
    ok(window.Chart.last.data.labels.length === 164, 'full range restored (' + window.Chart.last.data.labels.length + ')');
  }

  section('log-axis tick labels');
  {
    // Finding #7: the hardcoded allowlist stopped at 3e7, so the top of the
    // axis -- 32 status-years, up to $120M -- rendered with no labels.
    click(window, document.querySelector('#metric button[data-v="threshold"]'));
    ok(window.Chart.built > 1, 'switching metric rebuilds the chart');
    const y = window.Chart.last.options.scales.y;
    ok(y.type === 'logarithmic', 'threshold metric uses a log axis');
    const label = v => y.ticks.callback(v);
    [1e4, 3e4, 1e5, 1e6, 1e7, 3e7, 1e8, 3e8].forEach(v => {
      ok(label(v) !== '', 'labels ' + v + ' (' + label(v) + ')');
    });
    ok(label(1e8) === '$100M', '1e8 formats as $100M (' + label(1e8) + ')');
    ok(label(2e5) === '', 'off-sequence values stay unlabelled');

    // The axis must cover the largest value in the data.
    const data = JSON.parse(src.match(/<script id="taxdata" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    const max = Math.max(...data.years.flatMap(yr => Object.values(yr.statuses).map(st => st.topThresholdReal)));
    const labelled = [1e4,3e4,1e5,3e5,1e6,3e6,1e7,3e7,1e8,3e8,1e9].filter(v => label(v) !== '');
    ok(Math.max(...labelled) >= max,
       'top labelled tick clears the data max (' + Math.max(...labelled) + ' vs ' + max + ')');
    click(window, document.querySelector('#metric button[data-v="rates"]'));
  }

  section('table semantics (#10)');
  {
    const tr = document.querySelector('#tbody tr.taxrow');
    ok(!tr.hasAttribute('role'), 'ledger rows keep their native row role');
    ok(!tr.hasAttribute('tabindex'), 'ledger rows are not focus stops');
    const btn = tr.querySelector('.expand');
    ok(btn && btn.tagName === 'BUTTON', 'the first cell holds a real button');
    ok(btn && !btn.hasAttribute('aria-hidden'), 'the button is exposed to assistive tech');
    ok(btn && btn.getAttribute('tabindex') !== '-1', 'the button is reachable by keyboard');
    ok(btn && /\d{4}/.test(btn.getAttribute('aria-label') || ''), 'the button names its year (' + btn.getAttribute('aria-label') + ')');
    ok(document.querySelectorAll('#tbody tr[role="button"]').length === 0, 'no row anywhere carries role=button');
    // activating the button (what Enter/Space do natively) opens the modal
    click(window, btn);
    ok(document.getElementById('modal').hidden === false, 'activating the button opens the modal');
    click(window, document.getElementById('modal-close'));
  }

  section('modal focus trap (#11)');
  {
    const tr = document.querySelector('#tbody tr.taxrow');
    const opener = tr.querySelector('.expand');
    opener.focus();
    click(window, opener);
    const m = document.getElementById('modal');
    ok(document.activeElement === document.getElementById('modal-close'), 'focus moves into the dialog on open');

    const bg = [...document.body.children].filter(el => el.id !== 'modal' && el.tagName !== 'SCRIPT');
    ok(bg.length > 0 && bg.every(el => el.hasAttribute('inert')), 'the background is inert while open');
    ok(bg.every(el => el.getAttribute('aria-hidden') === 'true'), 'the background is hidden from assistive tech');

    const f = [...m.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    ok(f.length > 1, 'the dialog has several focus stops (' + f.length + ')');
    const first = f[0], last = f[f.length - 1];

    last.focus();
    m.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    ok(document.activeElement === first, 'Tab on the last control wraps to the first');

    first.focus();
    m.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    ok(document.activeElement === last, 'Shift+Tab on the first control wraps to the last');

    // focus that has escaped the dialog is pulled back
    document.getElementById('search').focus();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    ok(m.contains(document.activeElement), 'Tab from outside the dialog returns focus to it');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ok(m.hidden === true, 'Escape still closes');
    ok(bg.every(el => !el.hasAttribute('inert')), 'inert is lifted on close');
    ok(bg.every(el => !el.hasAttribute('aria-hidden')), 'aria-hidden is lifted on close');
    ok(document.activeElement === opener, 'focus returns to the control that opened it');
  }

  section('rows-per-page keeps focus (#12)');
  {
    const per = document.getElementById('per');
    per.focus();
    per.value = '50';
    fire(window, per, 'change');
    ok(document.getElementById('per') === per, 'the select element is not replaced');
    ok(document.activeElement === per, 'the select keeps focus after changing it');
    ok(rows(document) === 50, 'and the change still applies (' + rows(document) + ' rows)');
    per.value = '10'; fire(window, per, 'change');
    ok(document.getElementById('per').value === '10', 'the select reflects state after re-render');
  }

  section('controls');
  const single = document.querySelector('#status button[data-v="single"]');
  click(window, single);
  ok(single.getAttribute('aria-pressed') === 'true', 'filing-status selector updates');
  const metric = document.querySelectorAll('#metric button')[1];
  const builtBeforeMetric = window.Chart.built;
  click(window, metric);
  ok(metric.getAttribute('aria-pressed') === 'true', 'metric toggle updates');
  ok(window.Chart.built === builtBeforeMetric + 1, 'metric toggle rebuilds the chart exactly once');

  const hi = document.getElementById('hi');
  hi.value = '1950';
  fire(window, hi, 'input');
  ok(document.getElementById('hi-val').textContent === '1950', 'year-range readout updates');

  ok(clean(errors), 'no errors across the whole session (' + why(errors) + ')');
}

console.log('\n' + (failures ? failures + ' check(s) failed' : 'all checks passed'));
process.exit(failures ? 1 : 0);
