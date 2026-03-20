/**
 * pdfRenderer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper around pdf.js for the ITR Report assembly system.
 *
 * Exports:
 *  - getPageCount(url)                        → total page count of a PDF
 *  - renderPageToDataUrl(url, pageNum, scale) → PNG data URL for a thumbnail
 *  - renderPageToHtml(url, pageNum)           → self-contained A4 HTML for the
 *                                               print/preview report page
 *
 * The pdf.js GlobalWorkerOptions is configured lazily on first use so that
 * the worker is never loaded unless a PDF is actually needed.
 */

import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
// `?url` tells Vite to include the worker file as a static asset and gives us
// the correct public URL in both dev and production builds.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// ── Worker setup ─────────────────────────────────────────────────────────────
let workerConfigured = false
function ensureWorker() {
  if (workerConfigured) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc
  workerConfigured = true
}

// ── Document cache ────────────────────────────────────────────────────────────
// Caching loaded PDFDocument objects avoids re-fetching the same PDF when
// rendering multiple page thumbnails during picker interaction.
const docCache = new Map<string, PDFDocumentProxy>()

async function getDocument(url: string): Promise<PDFDocumentProxy> {
  if (docCache.has(url)) return docCache.get(url)!
  ensureWorker()
  const doc = await pdfjsLib.getDocument({ url, withCredentials: false }).promise
  docCache.set(url, doc)
  return doc
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the total number of pages in the PDF at `url`.
 */
export async function getPageCount(url: string): Promise<number> {
  const doc = await getDocument(url)
  return doc.numPages
}

/**
 * Renders a single PDF page to a PNG data URL.
 *
 * @param url     Full URL of the PDF (R2 public URL)
 * @param pageNum 1-based page number
 * @param scale   Render scale — 1.0 ≈ 96 dpi. Use 0.4–0.6 for thumbnails.
 */
export async function renderPageToDataUrl(
  url: string,
  pageNum: number,
  scale = 0.5,
): Promise<string> {
  const doc  = await getDocument(url)
  const page: PDFPageProxy = await doc.getPage(pageNum)

  const viewport = page.getViewport({ scale })
  const canvas   = document.createElement('canvas')
  canvas.width   = viewport.width
  canvas.height  = viewport.height

  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise

  const dataUrl = canvas.toDataURL('image/png')

  // Free PDF.js internal render resources and release canvas backing store
  // to prevent browser canvas context limit exhaustion on large PDFs.
  page.cleanup()
  canvas.width  = 0
  canvas.height = 0

  return dataUrl
}

/**
 * Renders a PDF page to a self-contained HTML string suitable for use as a
 * `ReportPage.html` entry in the ITR report page manager / print assembly.
 *
 * The page is rendered at 2× scale for crisp print quality. The `@page` rule
 * and wrapper dimensions are derived from the PDF page's natural size so that
 * landscape drawings (e.g. DWG sheets) are printed at their correct orientation
 * instead of being forced into portrait A4.
 *
 * PDF.js uses 72pt/inch internally, so: mm = points × 25.4 / 72
 *
 * @param url      Full URL of the PDF
 * @param pageNum  1-based page number
 * @param title    Optional page title shown as the HTML document title
 */
export async function renderPageToHtml(
  url: string,
  pageNum: number,
  title = '',
): Promise<{ html: string; widthMm: number; heightMm: number; pdfSourceUrl: string; pdfSourcePage: number }> {
  const doc  = await getDocument(url)
  const page: PDFPageProxy = await doc.getPage(pageNum)

  // Determine natural page dimensions (PDF points → mm, 72pt = 1 inch)
  const naturalVp = page.getViewport({ scale: 1.0 })
  const widthMm   = Math.round(naturalVp.width  * 25.4 / 72 * 10) / 10
  const heightMm  = Math.round(naturalVp.height * 25.4 / 72 * 10) / 10

  // Render at 2× for print quality
  const RENDER_SCALE = 2.0
  const viewport = page.getViewport({ scale: RENDER_SCALE })
  const canvas   = document.createElement('canvas')
  canvas.width   = viewport.width
  canvas.height  = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
  const dataUrl = canvas.toDataURL('image/png')

  page.cleanup()
  canvas.width  = 0
  canvas.height = 0

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    html, body {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      overflow: hidden;
      background: #fff;
    }
    .page {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .page img {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      object-fit: fill;
      display: block;
    }
  </style>
</head>
<body>
  <div class="page">
    <img src="${dataUrl}" alt="${escapeHtml(title)}"/>
  </div>
</body>
</html>`

  return { html, widthMm, heightMm, pdfSourceUrl: url, pdfSourcePage: pageNum }
}

/**
 * Clears the internal document cache (call when navigating away from a view
 * that loaded many PDFs to release memory).
 */
export function clearPdfCache() {
  docCache.forEach(doc => doc.destroy())
  docCache.clear()
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
