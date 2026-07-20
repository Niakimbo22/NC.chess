import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgSource = readFileSync(path.join(ROOT, 'public/icons/knight-medallion.svg'), 'utf8');

const targets = [
  { file: 'icon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-512-maskable.png', size: 512, maskable: true },
];

const wrapHtml = (svg) => `<!doctype html><html><head><style>
  html,body{margin:0;padding:0;}
  svg{display:block;width:100vw;height:100vh;}
</style></head><body>${svg}</body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const svg = t.maskable
    ? svgSource.replace(
        '<g id="content">',
        '<g id="content" transform="translate(50 50) scale(0.72) translate(-50 -50)">'
      )
    : svgSource;
  await page.setContent(wrapHtml(svg));
  await page.screenshot({ path: path.join(ROOT, 'public/icons', t.file) });
}
await browser.close();
console.log('Icons written to public/icons/');
