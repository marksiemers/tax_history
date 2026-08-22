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
  Chart.built = 0; Chart.destroyed = 0; Chart.updated = 0;
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

  section('controls');
  const single = document.querySelector('#status button[data-v="single"]');
  click(window, single);
  ok(single.getAttribute('aria-pressed') === 'true', 'filing-status selector updates');
  const metric = document.querySelectorAll('#metric button')[1];
  click(window, metric);
  ok(metric.getAttribute('aria-pressed') === 'true', 'metric toggle updates');
  ok(window.Chart.built > 1, 'metric toggle rebuilds the chart');

  const hi = document.getElementById('hi');
  hi.value = '1950';
  fire(window, hi, 'input');
  ok(document.getElementById('hi-val').textContent === '1950', 'year-range readout updates');

  ok(clean(errors), 'no errors across the whole session (' + why(errors) + ')');
}

console.log('\n' + (failures ? failures + ' check(s) failed' : 'all checks passed'));
process.exit(failures ? 1 : 0);
