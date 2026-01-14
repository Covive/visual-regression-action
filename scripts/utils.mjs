// utils.mjs
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

export const SIZES = [375, 1400];

// Project label (used just for logs). Defaults to your current folder name (e.g., "x12").
export const PROJECT = process.env.PROJECT || path.basename(process.cwd());

// Make sure capture has a place to write PNGs.
export function ensureDirs() {
  fs.mkdirSync('artifacts/current', { recursive: true });
}

export const slug = (s) =>
  slugify(s, { lower: true, strict: true }).replace(/-+/g, '-');

export async function stabilizePage(page, { maskSelectors = [] } = {}) {
  const masks = maskSelectors.length ? maskSelectors.join(',') : '';
  await page.addStyleTag({
    content: `
      * { animation: none !important; transition: none !important; caret-color: transparent !important; }
      html { scroll-behavior: auto !important; }
      ${masks ? `[data-test-ignore], ${masks} { background:#fff !important; color:#fff !important; }` : ''}
    `
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

export function pathFor(type, name, size) {
  const base = `artifacts/${type}`;
  return `${base}/${slug(name)}__${size}.png`;
}