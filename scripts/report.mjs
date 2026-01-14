import fs from 'fs';

// ---------- settings ----------
const DIFF_EPSILON = 0.000001; // treat tiny float noise as zero
const THRESHOLD_NOTE = 0.1;    // header display only
const KEEP_LAST = 10;          // keep last N reports (set to 0 to disable)

// Inline helper: read PNG → data URI (or empty string if missing)
function dataUri(p) {
  if (!fs.existsSync(p)) return '';
  const b64 = fs.readFileSync(p).toString('base64');
  return `data:image/png;base64,${b64}`;
}

// Load results (may be empty on first run)
const resultsPath = 'artifacts/results.json';
const results = fs.existsSync(resultsPath)
  ? JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
  : [];

// Group by key
const byKey = results.reduce((m, r) => {
  (m[r.key] = m[r.key] || []).push(r);
  return m;
}, {});

// Build HTML
let html = `<!doctype html>
<meta charset="utf-8" />
<title>Visual Regression Report</title>
<style>
  body{font:14px/1.4 system-ui, sans-serif; padding:24px; color:#111;}
  h1{margin:0 0 12px;}
  h2{margin:32px 0 8px;}
  .row{display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; align-items:start}
  .card{border:1px solid #ddd; padding:8px; border-radius:8px}
  img{max-width:100%; height:auto; display:block; background:#f9f9f9}
  .bad{background:#ffefef; border-color:#e88}
  .meta{font-size:12px; color:#555; margin-bottom:6px}
  .empty{padding:12px; border:1px dashed #ccc; border-radius:8px; color:#555; background:#fafafa}
</style>
<h1>Visual Regression Report</h1>
<p class="meta">Threshold: ${THRESHOLD_NOTE} • Generated: ${new Date().toISOString()}</p>
`;

const keysWithDiffs = Object.keys(byKey).filter(k =>
  (byKey[k] || []).some(r => (r.percent || 0) > DIFF_EPSILON)
);

if (keysWithDiffs.length === 0) {
  html += `<div class="empty">No visual differences detected.</div>`;
} else {
  for (const key of keysWithDiffs.sort()) {
    const rows = (byKey[key] || [])
      .filter(r => (r.percent || 0) > DIFF_EPSILON)
      .sort((a, b) => a.size - b.size);

    if (rows.length === 0) continue;

    html += `<h2>${key}</h2>`;

    for (const r of rows) {
      const size = r.size;
      const basePath = `baselines/${key}__${size}.png`;
      const curPath = `artifacts/current/${key}__${size}.png`;
      const diffPath = `artifacts/diffs/${key}__${size}.png`;

      const baseImg = dataUri(basePath);
      const curImg = dataUri(curPath);
      const difImg = dataUri(diffPath);

      const pctLabel = `${r.percent}% mismatched`;
      const cls = r.percent > THRESHOLD_NOTE ? 'card bad' : 'card';

      html += `
        <div class="row">
          <div class="${cls}">
            <div class="meta">Baseline — ${size}px</div>
            ${baseImg ? `<img src="${baseImg}" loading="lazy"/>` : `<div class="meta">missing</div>`}
          </div>
          <div class="${cls}">
            <div class="meta">Current — ${size}px</div>
            ${curImg ? `<img src="${curImg}" loading="lazy"/>` : `<div class="meta">missing</div>`}
          </div>
          <div class="${cls}">
            <div class="meta">Diff (${pctLabel}) — ${size}px</div>
            ${difImg ? `<img src="${difImg}" loading="lazy"/>` : `<div class="meta">missing</div>`}
          </div>
        </div>`;
    }
  }
}

// Write report with timestamp, plus latest alias
fs.mkdirSync('reports', { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = `reports/report-${timestamp}.html`;
fs.writeFileSync(reportPath, html);

// also write/overwrite a stable pointer
fs.writeFileSync('reports/latest.html', html);

// ---------- Generate summary.json for PR comments ----------
const summary = {
  total: Object.keys(byKey).length,
  passed: 0,
  changed: 0,
  failed: 0,
  urls: []
};

for (const key of Object.keys(byKey)) {
  const rows = byKey[key] || [];
  const maxPercent = Math.max(...rows.map(r => r.percent || 0));

  if (maxPercent < DIFF_EPSILON) {
    summary.passed++;
    summary.urls.push({ name: key, status: 'passed', diffPercent: 0 });
  } else if (maxPercent > THRESHOLD_NOTE) {
    summary.changed++;
    summary.urls.push({ name: key, status: 'changed', diffPercent: maxPercent });
  } else {
    summary.changed++;
    summary.urls.push({ name: key, status: 'changed', diffPercent: maxPercent });
  }
}

fs.mkdirSync('artifacts/report', { recursive: true });
fs.writeFileSync('artifacts/report/summary.json', JSON.stringify(summary, null, 2));

// optional cleanup: keep only last N
if (KEEP_LAST > 0) {
  const list = fs.readdirSync('reports')
    .filter(f => f.startsWith('report-') && f.endsWith('.html'))
    .sort()
    .reverse();
  for (const old of list.slice(KEEP_LAST)) {
    try { fs.unlinkSync(`reports/${old}`); } catch { }
  }
}

console.log(`Report written: ${reportPath}`);
console.log(`Also updated: reports/latest.html`);
console.log(`Summary written: artifacts/report/summary.json`);