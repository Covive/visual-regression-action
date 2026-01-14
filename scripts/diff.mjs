import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { SIZES } from './utils.mjs';

fs.mkdirSync('artifacts/diffs', { recursive: true });

if (!fs.existsSync('baselines')) {
  fs.writeFileSync('artifacts/results.json', JSON.stringify([], null, 2));
  console.log('No baselines/ folder found. Wrote empty results.json.');
  process.exit(0);
}

const files = fs.readdirSync('baselines');
const index = {};

for (const f of files) {
  const m = f.match(/(.+)__([0-9]+)\.png$/);
  if (!m) continue;
  const key = m[1];
  const size = Number(m[2]);
  (index[key] ||= new Set()).add(size);
}

function padTo(bmp, width, height) {
  // white background
  const out = new PNG({ width, height });
  // fill white
  out.data.fill(255); // R/G/B/A all 255 -> white/opaque
  // copy bmp into top-left
  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      const si = (y * bmp.width + x) << 2;
      const di = (y * width + x) << 2;
      out.data[di] = bmp.data[si];
      out.data[di + 1] = bmp.data[si + 1];
      out.data[di + 2] = bmp.data[si + 2];
      out.data[di + 3] = bmp.data[si + 3];
    }
  }
  return out;
}

const results = [];

for (const key of Object.keys(index)) {
  for (const w of SIZES) {
    const baselinePath = `baselines/${key}__${w}.png`;
    const currentPath  = `artifacts/current/${key}__${w}.png`;
    if (!fs.existsSync(baselinePath) || !fs.existsSync(currentPath)) continue;

    const baselineRaw = PNG.sync.read(fs.readFileSync(baselinePath));
    const currentRaw  = PNG.sync.read(fs.readFileSync(currentPath));

    const width  = Math.max(baselineRaw.width, currentRaw.width);
    const height = Math.max(baselineRaw.height, currentRaw.height);

    const baseline = (baselineRaw.width === width && baselineRaw.height === height)
      ? baselineRaw : padTo(baselineRaw, width, height);
    const current = (currentRaw.width === width && currentRaw.height === height)
      ? currentRaw : padTo(currentRaw, width, height);

    const diff = new PNG({ width, height });

    const mismatch = pixelmatch(
      baseline.data, current.data, diff.data,
      width, height,
      { threshold: 0.1, includeAA: true, alpha: 0.5 }
    );

    const diffPath = `artifacts/diffs/${key}__${w}.png`;
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const pct = (mismatch / (width * height)) * 100;
    results.push({ key, width, height, size: w, mismatch, percent: +pct.toFixed(3) });
    console.log(`Diff ${key} ${w}px → ${pct.toFixed(3)}%`);
  }
}

fs.writeFileSync('artifacts/results.json', JSON.stringify(results, null, 2));