// scripts/capture.mjs
import { chromium } from '@playwright/test';
import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SIZES,
  stabilizePage,
  pathFor,
  ensureDirs,
  PROJECT,
} from './utils.mjs';

// ---------- resolve urls.json (works locally + CI; supports URLS_PATH override) ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const urlsPath = process.env.URLS_PATH
  ? path.resolve(process.cwd(), process.env.URLS_PATH)
  : path.resolve(__dirname, '..', 'urls.json');
const urls = JSON.parse(await readFile(urlsPath, 'utf-8'));

// ---------- BASE_URL override support ----------
// Usage: BASE_URL=https://pr123-mtc.pantheonsite.io npm run capture:mtc
const BASE_URL = process.env.BASE_URL || null;

function buildTestUrl(originalUrl, baseUrl) {
  if (!baseUrl) return originalUrl;

  try {
    const original = new URL(originalUrl);
    const replacement = new URL(baseUrl);

    // Replace the origin (protocol + domain + port) but keep the path
    return `${replacement.origin}${original.pathname}${original.search}${original.hash}`;
  } catch (error) {
    console.warn(`⚠️  Failed to parse URL: ${originalUrl}, using original`);
    return originalUrl;
  }
}

// ---------- helpers ----------
async function waitForRender(page, {
  selectors = [],        // optional array of selectors to wait for (attached)
  quietMs = 800,         // how long DOM must stay mutation-free
  extraDelayMs = 1200,   // small buffer after load
  timeout = 30000        // overall budget
} = {}) {
  const deadline = Date.now() + timeout;

  // 1) DOM ready (many apps never fully go "network idle")
  await page.waitForLoadState('domcontentloaded', { timeout: Math.max(0, deadline - Date.now()) });

  // 2) Try networkidle briefly; don't fail if it never arrives
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // acceptable: long-polling / sockets keep network busy
  }

  // 3) Ensure likely content roots are attached (not necessarily visible)
  const defaults = [
    '.ChartFrameFull_chart__',  // chart container prefix (ok if absent)
    '.chartjs-size-monitor',    // Chart.js sentinel
    '.highcharts-container',
    '.aside-menu-item',
    'svg', 'canvas'
  ];
  const wanted = [...(Array.isArray(selectors) ? selectors : [selectors]).filter(Boolean), ...defaults];
  for (const sel of wanted) {
    try { await page.waitForSelector(sel, { state: 'attached', timeout: 1500 }); } catch { /* ignore */ }
  }

  // 4) small extra delay
  if (extraDelayMs > 0) await page.waitForTimeout(extraDelayMs);

  // 5) wait for a quiet DOM window (no mutations) for quietMs
  const overallMs = Math.max(0, deadline - Date.now());
  await page.evaluate(
    async ({ quietMs, overallMs }) => {
      const until = Date.now() + overallMs;

      function quietPromise() {
        return new Promise(resolve => {
          let t = setTimeout(done, quietMs);
          const obs = new MutationObserver(() => {
            clearTimeout(t);
            t = setTimeout(done, quietMs);
          });
          function done() { obs.disconnect(); resolve(); }
          obs.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
        });
      }

      while (Date.now() < until) {
        await quietPromise();
        // double RAF to flush paints
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return; // stable enough
      }
    },
    { quietMs, overallMs }
  );

  // 6) let webfonts settle (best-effort)
  try { await page.waitForFunction(() => document.fonts?.status === 'loaded', null, { timeout: 2000 }); } catch { }
}

// ---------- main ----------
ensureDirs(); // creates: $PROJECT/baselines, $PROJECT/artifacts/{current,diffs}, $PROJECT/reports

const browser = await chromium.launch();
const ctx = await browser.newContext({
  deviceScaleFactor: 1,
  viewport: { width: 1280, height: 900 }
});

for (const { name, url, waitFor = null, maskSelectors = [] } of urls) {
  for (const w of SIZES) {
    const page = await ctx.newPage();
    page.setDefaultTimeout(35000);
    await page.setViewportSize({ width: w, height: 900 });

    // Optional basic auth
    if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASS) {
      await ctx.setHTTPCredentials({
        username: process.env.BASIC_AUTH_USER,
        password: process.env.BASIC_AUTH_PASS
      });
    }

    // Navigate (avoid strict networkidle)
    const finalUrl = buildTestUrl(url, BASE_URL);
    console.log(`📸 Capturing: ${finalUrl}`);
    await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Robust render wait (honors per-URL "waitFor" if provided in urls.json)
    await waitForRender(page, {
      selectors: waitFor ? [waitFor] : [],
      quietMs: 800,
      extraDelayMs: 1200,
      timeout: 30000
    });

    // Normalize page (kill animations, apply masks)
    await stabilizePage(page, { maskSelectors });

    // Screenshot to $PROJECT/artifacts/current/<slug>__<size>.png
    const out = pathFor('current', name, w);
    await page.screenshot({ path: out, fullPage: true });
    await page.close();
    console.log(`[${PROJECT}] Captured ${out}`);
  }
}

await browser.close();