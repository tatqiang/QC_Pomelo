/**
 * /api/export-pdf  — Vercel serverless function
 *
 * POST body (JSON, max ~4 MB):
 *   { formHtml: string, fields: { [data-key]: value } }
 *
 * Response:
 *   200  application/pdf — raw PDF bytes
 *   400  { error: string } — missing formHtml
 *   500  { error: string } — render failure
 *
 * Runtime strategy:
 *   Vercel prod  → @sparticuz/chromium-min downloads Chromium to /tmp on cold start
 *   Local dev    → uses system Chrome (auto-detected) or CHROME_PATH env var
 */

import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'fs';
import https from 'node:https';
import http from 'node:http';

// ── Chromium binary URL (GitHub Releases) ────────────────────────────────
// Must match the installed @sparticuz/chromium-min version exactly.
// From v143.0.4 the release uses arch-specific filenames; Vercel runs x64 Linux.
const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar';

// ── Resolve the correct Chrome executable ────────────────────────────────
async function getExecPath() {
  // In Vercel production the env var VERCEL is set to "1"
  if (process.env.VERCEL) {
    return chromium.executablePath(CHROMIUM_PACK_URL);
  }
  // Allow explicit override (useful for CI or non-standard Chrome installs)
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  // Auto-detect common system Chrome locations (Windows + Linux)
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    'Local Chrome not found. Set CHROME_PATH env var or install Google Chrome.\n' +
    'Example: set CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  );
}

// ── Main handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS — allow any same-site request; during local dev allow localhost origins
  const origin = req.headers.origin ?? '';
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let { formHtml, fields = {} } = req.body ?? {};

  if (!formHtml || typeof formHtml !== 'string') {
    return res.status(400).json({ error: '`formHtml` (string) is required in the request body.' });
  }

  // ── Inject border fix for CSS-Grid checklist cells ────────────────────
  // Chromium's PDF path silently drops border-right/border-bottom on grid cells.
  // Puppeteer uses page.setContent() directly (no srcdoc iframe), so @media print fires.
  // Chrome drops border-right/bottom on CSS Grid children in print.
  // Fix: .gc uses border-top/left; .main-grid (flex child) owns the outer right/bottom.
  const PRINT_BORDER_FIX = `<style>
@media print {
  .gc {
    border-top:    1px solid #000 !important;
    border-left:   1px solid #000 !important;
    border-right:  none !important;
    border-bottom: none !important;
  }
  .main-grid {
    border-top:    none !important;
    border-left:   none !important;
    border-right:  1px solid #000 !important;
    border-bottom: 1px solid #000 !important;
  }
  html, body { margin: 0 !important; padding: 0 !important; background-color: #fff !important; }
  .a4-container { box-shadow: none !important; }
  .section-box, .header-row-1, .header-row-2,
  .page-date-box, .note-row, .sig-section, .sig-line {
    border-color: #000 !important;
  }
  table, th, td { border-color: #000 !important; }
}
</style>`;
  if (formHtml.includes('</head>')) {
    formHtml = formHtml.replace('</head>', PRINT_BORDER_FIX + '\n</head>');
  }

  const fieldCount = Object.keys(fields).length;
  console.log(`[export-pdf] start — ${fieldCount} fields, html ${(formHtml.length / 1024).toFixed(1)} KB`);

  let browser;
  try {
    const executablePath = await getExecPath();

    // In production use sparticuz args (tuned for Lambda/Vercel sandbox).
    // Locally use minimal flags so system Chrome doesn't receive Lambda-only args.
    const isVercel = !!process.env.VERCEL;
    const launchArgs = isVercel
      ? [...chromium.args, '--font-render-hinting=none']
      : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none',
        ];

    browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: isVercel ? chromium.defaultViewport : null,
      executablePath,
      headless: isVercel ? chromium.headless : true,
    });

    const page = await browser.newPage();

    // Pipe browser console → Node console so logs appear in Vercel function output
    page.on('console', msg => console.log(`[puppeteer:${msg.type()}]`, msg.text()));
    page.on('pageerror', err => console.error('[puppeteer:pageerror]', err.message));

    // ── Expose Node.js image fetch — MUST be called before setContent ─────
    // Node.js fetches cross-origin URLs (no CORS restriction) and returns them
    // as data: URIs.  A data: URI loaded into new Image() is same-origin, so
    // canvas.toDataURL() never throws SecurityError — no browser flags needed.
    await page.exposeFunction('_fetchAsDataUrl', (url) => new Promise((resolve) => {
      const lib = url.startsWith('https') ? https : http;
      lib.get(url, (resp) => {
        if (resp.statusCode !== 200) { resp.resume(); resolve(null); return; }
        const chunks = [];
        resp.on('data', c => chunks.push(c));
        resp.on('end', () => {
          const buf = Buffer.concat(chunks);
          const ct  = resp.headers['content-type'] || 'image/jpeg';
          console.log(`[fetch] ${(buf.length/1024).toFixed(0)} KB  ${url.slice(0, 60)}`);
          resolve(`data:${ct};base64,${buf.toString('base64')}`);
        });
      }).on('error', e => { console.log(`[fetch] ERR ${e.message}`); resolve(null); });
    }));

    // A4 at 96 dpi, deviceScaleFactor:1 — keeps images at CSS-display size
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });

    const httpImgTags = (formHtml.match(/src="https?:\/\//gi) || []).length;
    console.log(`[export-pdf] html ${(formHtml.length/1024).toFixed(1)} KB | http <img>: ${httpImgTags}`);

    // ── Intercept & abort full-resolution cross-origin image requests ─────
    // Without this, Chromium downloads every photo at original resolution
    // (5–15 MB each) before we can compress them, exhausting the 1 GB memory
    // limit and causing "Protocol error: Printing failed".
    // We abort those loads here; _fetchAsDataUrl injects compressed data URIs.
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.resourceType() === 'image' && /^https?:\/\//.test(req.url())) {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });

    // domcontentloaded is sufficient — external images are aborted above;
    // fonts are awaited separately below.
    await page.setContent(formHtml, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await page.evaluate(() => document.fonts.ready);
    await delay(400);

    // ── Compress images: Node fetch → data URI → canvas resize/re-encode ──
    // Node.js has no CORS restriction, so _fetchAsDataUrl succeeds for R2 URLs.
    const compressResult = await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img[src]'))
        .filter(img => /^https?:\/\//.test(img.getAttribute('src') || ''));
      console.log(`[compress] http-src images: ${imgs.length}`);

      const MAX_PX  = 800;
      const QUALITY = 0.65;
      let ok = 0, skip = 0, err = 0;
      for (const img of imgs) {
        try {
          const dataUrl = await window._fetchAsDataUrl(img.getAttribute('src'));
          if (!dataUrl) { skip++; continue; }
          await new Promise((res, rej) => {
            const t = new Image();
            t.onload = () => {
              let w = t.naturalWidth, h = t.naturalHeight;
              if (!w || !h) { skip++; res(); return; }
              if (w > MAX_PX || h > MAX_PX) {
                const s = MAX_PX / Math.max(w, h);
                w = Math.round(w * s); h = Math.round(h * s);
              }
              const c = document.createElement('canvas');
              c.width = w; c.height = h;
              c.getContext('2d').drawImage(t, 0, 0, w, h);
              img.src = c.toDataURL('image/jpeg', QUALITY);
              ok++;
              console.log(`[compress] → ${w}x${h}`);
              res();
            };
            t.onerror = () => { err++; rej(new Error('load failed')); };
            t.src = dataUrl;
          });
        } catch(e) {
          err++;
          console.log(`[compress] error: ${e.message}`);
        }
      }
      return { total: imgs.length, ok, skip, err };
    });
    console.log('[export-pdf] compress:', JSON.stringify(compressResult));
    // Let the browser repaint after replacing all img.src values
    await delay(300);

    // ── Inject field values ───────────────────────────────────────────────
    await page.evaluate((f) => {
      Object.keys(f).forEach((key) => {
        const el = document.querySelector(`[data-key="${key}"]`);
        if (!el) return;
        if (el.type === 'checkbox') {
          el.checked = !!f[key];
        } else {
          el.value = f[key] ?? '';
          el.setAttribute('value', el.value);
        }
      });

      // Flush textarea content into DOM (required for PDF rendering)
      document.querySelectorAll('textarea').forEach((ta) => {
        ta.textContent = ta.value;
      });

      // Lock the form: removes blue input background, hides action buttons
      document.body.classList.add('locked');
    }, fields);

    await delay(200);

    // ── Explicit re-apply of baked-in form data ───────────────────────────
    // The processHtmlForm inject() script runs on DOMContentLoaded, but in
    // Puppeteer's null-origin context localStorage is blocked so the form's own
    // loadData() silently returns early.  We re-apply the same DATA object here
    // (exposed as window.__INJECT_DATA__) via page.evaluate to guarantee every
    // [data-key] text input, checkbox, textarea, and [data-sigkey] signature
    // image is correctly populated regardless of the form's own JS.
    //
    // IMPORTANT — checkbox rendering in PDF:
    // input[type="checkbox"]::after pseudo-elements are NOT reliably rendered by
    // Chromium's PDF path (inputs are replaced elements; ::after is non-standard
    // for them in the PDF renderer even with appearance:none).  A direct DOM ✓
    // <span> injected as a sibling is the only truly reliable approach.
    const injectDataKeys = await page.evaluate(() => {
      const data = window.__INJECT_DATA__;
      if (!data || typeof data !== 'object') return 0;
      let applied = 0;

      // 1. [data-key] text inputs, textareas, checkboxes
      Object.keys(data).forEach(k => {
        const el = document.querySelector(`[data-key="${k}"]`);
        if (!el) return;
        const v = data[k];
        if (el.type === 'checkbox') {
          const isChecked = (v === true || v === 'true' || v === '1' || v === 'yes' || v === 'on');
          el.checked = isChecked;
          // Sync content attribute (needed for some CSS selectors)
          if (isChecked) el.setAttribute('checked', '');
          else el.removeAttribute('checked');

          // Inject an explicit ✓ <span> so PDF rendering doesn't rely on
          // input::after pseudo-element (which Chromium PDF may not render).
          const cell = el.parentElement;
          if (cell && !cell.querySelector('.pdf-chk')) {
            const mark = document.createElement('span');
            mark.className = 'pdf-chk';
            mark.textContent = '\u2713'; // ✓
            mark.style.cssText = [
              'font-size:13px',
              'font-weight:bold',
              'color:#000',
              'display:' + (isChecked ? 'block' : 'none'),
              'line-height:1',
              'text-align:center',
              'pointer-events:none',
            ].join(';');
            cell.appendChild(mark);
            // Hide the native checkbox so only our span shows
            el.style.cssText = 'opacity:0;width:15px;height:15px;position:absolute;';
          } else if (cell) {
            const mark = cell.querySelector('.pdf-chk');
            if (mark) mark.style.display = isChecked ? 'block' : 'none';
            el.style.cssText = 'opacity:0;width:15px;height:15px;position:absolute;';
          }
        } else {
          el.value = v ?? '';
          if (el.tagName === 'TEXTAREA') el.textContent = v ?? '';
          el.setAttribute('value', el.value);
        }
        applied++;
      });

      // 2. [data-sigkey] signature images (stored as data: URIs)
      Object.keys(data).forEach(k => {
        const v = String(data[k] || '');
        if (!v.startsWith('data:')) return;
        const sigEl = document.querySelector(`[data-sigkey="${k}"]`);
        if (!sigEl) return;
        const img = sigEl.querySelector('img.sig-preview');
        if (!img) return;
        img.src = v;
        img.classList.add('has-sig');
        img.style.display = 'block';
        applied++;
      });

      // 3. Populate _savedData for forms that dynamically build rows (GN-02)
      if (typeof window._savedData !== 'undefined') {
        Object.assign(window._savedData, data);
      }

      return applied;
    });
    console.log(`[export-pdf] re-inject: ${injectDataKeys} fields applied from __INJECT_DATA__`);

    // ── Re-trigger row building for forms with dynamic table rows ─────────
    await page.evaluate(() => {
      if (typeof window.scheduleRepaginate === 'function') {
        window.scheduleRepaginate();
      } else if (typeof window.repaginate === 'function') {
        window.repaginate();
      }
    });
    await delay(300); // repaginate timer is 120 ms; let it finish + paint

    // ── Generate PDF ──────────────────────────────────────────────────────
    // emulateMediaType('print') is REQUIRED before page.pdf() — without it
    // Chromium's PDF renderer can crash with "Protocol error: Printing failed"
    // when the page contains many embedded images.
    await page.emulateMediaType('print');
    const pdfBytes = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });

    const sizeKb = (pdfBytes.length / 1024).toFixed(1);
    console.log(`[export-pdf] done — ${sizeKb} KB  (${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="export.pdf"');
    return res.end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('[export-pdf] error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      await browser.close().catch(() => {}); // never let close() crash the response
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
