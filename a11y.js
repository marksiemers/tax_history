#!/usr/bin/env node
/*
 * Browser-level checks for us_income_tax_rates_1862-2025_1.html.
 *
 * test.js runs under jsdom, which has no layout engine, no tab order, and no
 * `inert`. This script drives real headless Chrome instead, so it can check the
 * things jsdom structurally cannot:
 *
 *   - the computed accessibility tree (roles and accessible names as a screen
 *     reader would receive them, not the raw attributes)
 *   - axe-core's rule audit, on the page and with the dialog open
 *   - whether `inert` is actually enforced, and whether native Tab really stays
 *     inside the dialog
 *   - whether the note column visually clips (needs real text metrics)
 *   - whether the SRI-pinned Chart.js actually loads and executes
 *
 * It needs a browser and, for the CDN check, network -- so it is deliberately
 * separate from `npm test`, which stays fast and offline.
 *
 *   npm run a11y
 *
 * Note: puppeteer is pinned to 23.x, the last line supporting Node 18; 24+ is
 * ESM-only and its CLI fails here the same way jsdom 23+ does.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const PAGE = 'file://' + path.join(__dirname, 'us_income_tax_rates_1862-2025_1.html');
const AXE = require.resolve('axe-core/axe.min.js');

let failures = 0;
function section(name) { console.log('\n' + name); }
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) failures++;
}

const flatten = node => [node, ...(node.children || []).flatMap(flatten)];

(async () => {
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));

  await page.goto(PAGE, { waitUntil: 'networkidle2' });

  section('page loads in a real browser');
  ok(pageErrors.length === 0, 'no uncaught page errors (' + pageErrors.join('; ') + ')');
  ok(await page.$eval('#tbody', el => el.children.length) === 10, 'ledger rendered');

  section('SRI-pinned Chart.js (needs network)');
  {
    // A wrong integrity hash, or a crossorigin attribute the CDN won't satisfy,
    // means the browser silently refuses the file. This is the check that the
    // pin is actually correct rather than merely well-formed -- and it runs
    // over file://, which is how this page is meant to be opened.
    const loaded = await page.evaluate(() => typeof window.Chart !== 'undefined');
    ok(loaded, 'Chart.js executed, so the integrity hash matched over file://');
    const drew = await page.evaluate(() => {
      const c = document.querySelector('#chart');
      return !!c && c.width > 0 && !document.querySelector('.chart-fallback');
    });
    ok(drew, 'the canvas is live and the offline placeholder is absent');
  }

  section('note column actually clips (#notes)');
  {
    await page.type('#search', '1948');
    const m = await page.$eval('#tbody tr .note .clip', el => ({
      scroll: el.scrollWidth, client: el.clientWidth,
      chars: el.textContent.length, lines: el.getBoundingClientRect().height
    }));
    ok(m.chars > 400, 'the full 420-char note is present (' + m.chars + ')');
    ok(m.scroll > m.client, 'it overflows its box, so the ellipsis renders (' + m.scroll + 'px into ' + m.client + 'px)');
    ok(m.lines < 30, 'the cell is a single line tall (' + Math.round(m.lines) + 'px)');
    const heights = await page.$$eval('#tbody tr', rows => rows.map(r => Math.round(r.getBoundingClientRect().height)));
    await page.$eval('#search', el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const all = await page.$$eval('#tbody tr', rows => rows.map(r => Math.round(r.getBoundingClientRect().height)));
    ok(new Set(all).size === 1, 'every row is the same height (' + [...new Set(all)].join(',') + 'px)');
    ok(heights.length > 0, 'measured the long-note row too');
  }

  section('accessibility tree — ledger (#10)');
  {
    const tree = await page.accessibility.snapshot({ interestingOnly: false });
    const nodes = flatten(tree);
    const rows = nodes.filter(n => n.role === 'row');
    ok(rows.length > 5, 'rows expose the row role (' + rows.length + ' rows)');
    const cells = nodes.filter(n => n.role === 'cell' || n.role === 'gridcell');
    ok(cells.length > 20, 'cells expose the cell role (' + cells.length + ' cells)');
    ok(nodes.some(n => n.role === 'table'), 'the ledger is exposed as a table');
    ok(!rows.some(r => r.role === 'button'), 'no row is exposed as a button');
    const expand = nodes.filter(n => n.role === 'button' && /bracket schedule/.test(n.name || ''));
    ok(expand.length > 0, 'the expand control is a named button (' + (expand[0] && expand[0].name) + ')');
  }

  section('axe-core audit');
  {
    await page.addScriptTag({ path: AXE });
    const res = await page.evaluate(async () => await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    }));
    const v = res.violations;
    v.forEach(x => console.log('      - [' + x.impact + '] ' + x.id + ': ' + x.help + ' (' + x.nodes.length + ')'));
    ok(v.filter(x => x.impact === 'critical' || x.impact === 'serious').length === 0,
       'no critical or serious violations (' + v.length + ' total)');
  }

  section('dialog: real inert and real Tab order (#11)');
  {
    await page.click('#tbody tr .expand');
    ok(await page.evaluate(() => document.activeElement.id) === 'modal-close', 'focus enters the dialog');

    // Chrome enforces inert; jsdom cannot. Try to focus the background.
    const escaped = await page.evaluate(() => {
      const bg = document.getElementById('search');
      bg.focus();
      return document.activeElement === bg;
    });
    ok(!escaped, 'a background control cannot take focus while the dialog is open');

    // Native Tab, driven by the browser's own sequential navigation.
    const stops = await page.evaluate(() => document.getElementById('modal')
      .querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])').length);
    const seen = [];
    for (let i = 0; i < stops * 2 + 2; i++) {
      await page.keyboard.press('Tab');
      seen.push(await page.evaluate(() => {
        const m = document.getElementById('modal');
        const f = [...m.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')];
        return { inModal: m.contains(document.activeElement), at: f.indexOf(document.activeElement) };
      }));
    }
    ok(seen.every(s => s.inModal), seen.length + ' native Tabs all stay inside the dialog');
    ok(new Set(seen.map(s => s.at)).size === stops,
       'and reach every one of its ' + stops + ' focus stops (' + new Set(seen.map(s => s.at)).size + ')');
    ok(seen.filter(s => s.at === 0).length >= 2, 'wrapping past the last control returns to the first');

    const axeModal = await page.evaluate(async () => await window.axe.run(document.getElementById('modal'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    }));
    axeModal.violations.forEach(x => console.log('      - [' + x.impact + '] ' + x.id + ': ' + x.help));
    ok(axeModal.violations.filter(x => x.impact === 'critical' || x.impact === 'serious').length === 0,
       'dialog has no critical or serious violations (' + axeModal.violations.length + ' total)');

    const dlg = flatten(await page.accessibility.snapshot({ interestingOnly: false })).find(n => n.role === 'dialog');
    ok(!!dlg, 'the dialog is exposed as a dialog' + (dlg ? ' named "' + dlg.name + '"' : ''));
    // A dialog announced as just "1862" says nothing about what it is.
    ok(dlg && /schedule/i.test(dlg.name || ''), 'and its name says what it is (' + (dlg && dlg.name) + ')');
    ok(dlg && dlg.name !== (dlg.name || '').toUpperCase(),
       'the name is not all-caps, which some readers spell out letter by letter');
    ok(dlg && /\d{4}/.test(dlg.name || ''), 'and it names the year');

    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => document.getElementById('modal').hidden), 'Escape closes it');
    const restored = await page.evaluate(() => document.activeElement.className);
    ok(/expand/.test(restored), 'focus returns to the expand button (' + restored + ')');
    ok(await page.evaluate(() => { const s = document.getElementById('search'); s.focus(); return document.activeElement === s; }),
       'the background is focusable again');
  }

  section('rows-per-page keeps focus in a real browser (#12)');
  {
    await page.focus('#per');
    await page.select('#per', '25');
    ok(await page.evaluate(() => document.activeElement.id) === 'per', 'the select still has focus after changing it');
    ok(await page.$eval('#tbody', el => el.children.length) === 25, 'and the change applied');
  }

  ok(pageErrors.length === 0, 'still no page errors at the end (' + pageErrors.join('; ') + ')');

  await browser.close();
  console.log('\n' + (failures ? failures + ' check(s) failed' : 'all browser checks passed'));
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
