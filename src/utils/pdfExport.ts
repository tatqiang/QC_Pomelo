/**
 * pdfExport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Assembles a multi-page PDF file from the ITR report page list and triggers a
 * browser download — bypassing the browser's print dialog entirely.
 *
 * Strategy per page type:
 *   • pdf_page  (has pdfSourceUrl)  → copy the page directly from the source
 *                                     PDF via pdf-lib copyPages() — vector
 *                                     quality, preserves original size &
 *                                     orientation (landscape DWG sheets, etc.)
 *   • html_form / image             → render the self-contained HTML in a
 *                                     hidden same-origin iframe, capture with
 *                                     html2canvas, embed as a PNG image page
 *                                     in pdf-lib at the correct A4 dimensions.
 */

import { PDFDocument } from 'pdf-lib'

// 1 PDF point = 1/72 inch; 1 mm = 25.4 / 72 points
const MM_TO_PT = 72 / 25.4

// Browser default CSS resolution is 96dpi; 1pt = 96/72 px
const PT_TO_PX = 96 / 72

/** Minimal page descriptor (matches ReportPage from ITRReportModal.vue) */
export interface ExportPage {
  title:         string
  html:          string
  widthMm?:      number
  heightMm?:     number
  /** For pdf_page items: direct source coordinates for pdf-lib copyPages() */
  pdfSourceUrl?: string
  pdfSourcePage?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** UI-only elements that must never appear in the exported PDF. */
const UI_ONLY_SEL = '#btn-group, #sig-popup, .edit-btn, .add-sig-btn, .photo-fit-btn, [data-pdf-hide]'

/**
 * Pre-processes a form HTML string so it renders perfectly in html2canvas.
 *
 * Steps:
 *  1. Parse with DOMParser.
 *  2. Replace <input>/<textarea> with same-class <div> (preserves flex CSS,
 *     uses the `value` attribute written by processHtmlForm).
 *  3. Fetch all external <img> URLs and compress to ≤1200 px JPEG data URIs.
 *  4. Strip <script> tags.
 *  5. Inject a <style> hiding UI chrome and resetting background.
 */
async function prepareHtmlForPdf(htmlString: string): Promise<string> {
  const parser = new DOMParser()
  const doc    = parser.parseFromString(htmlString, 'text/html')

  // ── 1. Replace text inputs / textareas with same-class divs ───────────────
  const INPUT_SEL = [
    'input:not([type=checkbox]):not([type=radio]):not([type=image]):not([type=hidden])',
    'textarea',
  ].join(', ')

  doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(INPUT_SEL)
    .forEach(ctrl => {
      const div = doc.createElement('div')
      div.className = ctrl.className          // identical classes → identical CSS rules
      div.textContent = ctrl.getAttribute('value') ?? ctrl.textContent ?? ''
      div.style.backgroundColor = 'transparent'  // remove blue highlight
      ctrl.parentNode?.replaceChild(div, ctrl)
    })

  // ── 2. Fetch external images → compressed data URIs ───────────────────────
  // Photos shot on phones can be 5–10 MB each; downscale to ≤1200 px on the
  // longest side at JPEG 0.75 quality before embedding.  This typically reduces
  // a 5 MB photo to ~150 KB with no visible quality loss in print.
  const MAX_PX  = 1200   // max dimension (px) — A4 at 144 dpi is ~1190 px wide
  const QUALITY = 0.75   // JPEG quality 0–1

  async function fetchAndCompress(src: string): Promise<string> {
    const resp = await fetch(src, { cache: 'no-cache' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    const bmp  = await createImageBitmap(blob)
    let { width: w, height: h } = bmp
    if (w > MAX_PX || h > MAX_PX) {
      const scale = MAX_PX / Math.max(w, h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    return canvas.toDataURL('image/jpeg', QUALITY)
  }

  const imgs = Array.from(doc.querySelectorAll<HTMLImageElement>('img[src]'))
  await Promise.allSettled(imgs.map(async (img) => {
    const src = img.getAttribute('src') ?? ''
    if (!src.startsWith('http')) return   // already inline (data: or relative)
    try {
      const dataUrl = await fetchAndCompress(src)
      img.setAttribute('src', dataUrl)
    } catch {
      // CORS-blocked or unavailable — replace with a neutral photo placeholder
      const ph = doc.createElement('div')
      const w  = img.getAttribute('width')  || img.clientWidth  || 120
      const h  = img.getAttribute('height') || img.clientHeight || 90
      ph.style.cssText = [
        `width:${w}px`, `height:${h}px`,
        'background:#dedede', 'border:1px solid #bbb',
        'display:inline-flex', 'align-items:center', 'justify-content:center',
        'font-size:11px', 'color:#888', 'font-family:sans-serif',
        'vertical-align:top',
      ].join(';')
      ph.textContent = '[photo]'
      img.parentNode?.replaceChild(ph, img)
    }
  }))

  // ── 3. Keep form-init scripts so repaginate() / scheduleRepaginate() can run ──
  // GN-02 and similar forms build table rows dynamically from _savedData inside
  // repaginate(). If we strip scripts, tbody stays empty in the captured iframe.
  // Only remove CDN scripts that won't load in the iframe context anyway, and
  // pure print-trigger scripts that have no effect on DOM structure.
  doc.querySelectorAll<HTMLScriptElement>('script[src]').forEach(s => {
    const src = s.getAttribute('src') ?? ''
    if (/cloudflare|jsdelivr|unpkg|cdnjs|shared-sig/.test(src)) s.remove()
  })
  doc.querySelectorAll<HTMLScriptElement>('script:not([src])').forEach(s => {
    const t = s.textContent ?? ''
    if (/window\.print\(\)|beforeprint|afterprint/.test(t) &&
        !/repaginate|scheduleRepag|inject|_savedData|INJECT_FIELDS/.test(t)) s.remove()
  })

  // ── 4. Checkbox replacement is deferred to runtime inside the capture script ─
  // Checkboxes must remain as real <input> elements until after the form's own
  // repaginate() / inject() have run inside the iframe — only then do we know
  // their correct runtime .checked state. html2canvas also does not support
  // ::after pseudo-elements, so we replace them with styled divs at capture time.

  // ── 5. Inject html2canvas CDN + inline capture script ──────────────────────
  // html2canvas MUST run inside the iframe's own JS context so that
  // getComputedStyle() reads styles from the correct window.
  // The inline script listens for a 'capture' postMessage from the parent,
  // runs the capture entirely inside the iframe, and sends back the PNG data URL.
  const h2cScript = doc.createElement('script')
  h2cScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
  doc.body.appendChild(h2cScript)

  const captureScript = doc.createElement('script')
  captureScript.textContent = `
    window.addEventListener('message', async function(e) {
      if (e.data !== '__pdf_capture__') return;
      try {
        // Wait for html2canvas to be available
        var tries = 0;
        while (!window.html2canvas && tries < 100) {
          await new Promise(function(r) { setTimeout(r, 100); });
          tries++;
        }
        if (!window.html2canvas) throw new Error('html2canvas not loaded');

        // Wait for fonts
        try {
          await Promise.allSettled([
            document.fonts.load('400 10px Sarabun'),
            document.fonts.load('400 13px Sarabun'),
            document.fonts.load('400 16px Sarabun'),
            document.fonts.load('700 13px Sarabun'),
            document.fonts.load('700 16px Sarabun'),
            document.fonts.load('700 17px Sarabun'),
            document.fonts.ready,
          ]);
        } catch(e) {}
        await new Promise(function(r) { setTimeout(r, 900); });

        // Replace all checkboxes with styled divs using their RUNTIME .checked state.
        // Must happen here (after repaginate/inject have run) because:
        //   1. Dynamic rows are created by repaginate() — they don't exist at parse time.
        //   2. html2canvas does not render ::after pseudo-elements (used for the ✓ mark).
        var CB_STYLE = [
          'width:15px','height:15px','display:inline-flex',
          'align-items:center','justify-content:center',
          'background:transparent','border:1px solid #000',
          'font-size:13px','font-weight:bold','line-height:1',
          'color:#000','flex-shrink:0','vertical-align:middle','box-sizing:border-box',
        ].join(';');
        document.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
          var div = document.createElement('div');
          div.style.cssText = CB_STYLE;
          if (cb.checked) div.textContent = '\u2713';
          if (cb.parentNode) cb.parentNode.replaceChild(div, cb);
        });
        // Small settle delay after DOM mutation
        await new Promise(function(r) { setTimeout(r, 50); });

        var el = document.querySelector('.a4-container') || document.querySelector('.a4-page') || document.documentElement;
        var canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
        });
        parent.postMessage({
          type: '__pdf_capture_result__',
          dataUrl: canvas.toDataURL('image/png'),
        }, '*');
      } catch(err) {
        parent.postMessage({
          type: '__pdf_capture_result__',
          error: err.message || 'capture failed',
        }, '*');
      }
    });
  `
  doc.body.appendChild(captureScript)

  // ── 6. Inject CSS overrides (same ones the standalone export uses) ─────────
  const style = doc.createElement('style')
  style.textContent = `
    ${UI_ONLY_SEL} { display: none !important; }
    html, body { background: #fff !important; }

    /* Issue 1 — body padding: 20px + min-width: fit-content makes the body
       wider than the capture viewport, showing padding only on left/top.
       Remove it so the .a4-container fills the capture area exactly. */
    body { padding: 0 !important; margin: 0 !important; min-width: 0 !important; }
    .a4-container, .a4-page { box-shadow: none !important; }

    /* Input elements are replaced with same-class divs during preprocessing.
       The original CSS targets input.val-cell — extend rules to div.val-cell
       so underlines and layout are preserved in the captured output. */
    div.val-cell {
      border-bottom: 1px solid #000 !important;
      min-height: 18px !important;
      box-sizing: border-box !important;
      padding: 1px 4px !important;
      font-size: 11px !important;
    }

    /* Issues 2 & 3 — html2canvas v1.4.1 mis-renders nested flex align-items:
       flex-end: text is drawn at the TOP of the container while border-bottom
       stays at the bottom, making the underline appear through the text.
       Sarabun's large Thai line-height (~1.8×) amplifies the visual gap.
       Fix: use baseline alignment (reliable in html2canvas) and remove the
       inner flex from .value to prevent the double-flex rendering bug. */
    .info-row, .note-row { align-items: baseline !important; }
    .value { display: block !important; }

    /* Issue 4 — html2canvas v1.4.1 ignores border-collapse: collapse and
       renders each cell's border independently (as if separate), doubling
       the visible border width (1px → 2px between cells).
       Fix: halve the declared border-width so the doubled result equals 1px. */
    table { border-collapse: collapse !important; }
    th, td { border-width: 0.5px !important; }
  `
  doc.head.appendChild(style)

  return doc.documentElement.outerHTML
}

/**
 * Ensures the Sarabun Google Font is loaded in the main-document font cache.
 * html2canvas creates its canvas in the captured document's context, but the
 * browser shares the glyph/metrics cache across documents for the same origin;
 * pre-warming here guarantees measureText(' ') returns the correct value so
 * spaces are not collapsed in the rendered output.
 */
let _fontsWarmedUp = false
async function ensureGoogleFontsPreloaded(): Promise<void> {
  if (_fontsWarmedUp) return
  if (!document.querySelector('link[href*="Sarabun"]')) {
    await new Promise<void>(resolve => {
      const link = document.createElement('link')
      link.rel  = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap'
      link.onload  = () => resolve()
      link.onerror = () => resolve()   // offline / blocked — continue anyway
      document.head.appendChild(link)
    })
  }
  await Promise.allSettled([
    document.fonts.load('400 10px Sarabun'),
    document.fonts.load('400 12px Sarabun'),
    document.fonts.load('400 13px Sarabun'),
    document.fonts.load('400 16px Sarabun'),
    document.fonts.load('400 17px Sarabun'),
    document.fonts.load('700 12px Sarabun'),
    document.fonts.load('700 13px Sarabun'),
    document.fonts.load('700 16px Sarabun'),
    document.fonts.load('700 17px Sarabun'),
    document.fonts.ready,
  ])
  _fontsWarmedUp = true
}

/**
 * Renders prepared HTML in a hidden iframe.  html2canvas runs entirely inside
 * the iframe's own JavaScript context (triggered via postMessage) so that
 * getComputedStyle() reads styles from the same window as the elements.
 *
 * Returns a PNG data URL string (not a canvas object) to avoid cross-window
 * object lifetime issues when the iframe is cleaned up.
 */
async function renderHtmlToCanvas(html: string, widthPx: number, heightPx: number): Promise<string> {
  await ensureGoogleFontsPreloaded()

  const iframe = document.createElement('iframe')
  iframe.style.cssText = [
    'position:fixed', 'left:0', 'top:0',
    `width:${widthPx}px`, `height:${heightPx}px`,
    'opacity:0', 'pointer-events:none', 'border:none',
    'overflow:hidden', 'z-index:-9999',
  ].join(';')
  document.body.appendChild(iframe)

  try {
    // Load the prepared HTML into the iframe
    await new Promise<void>((resolve, reject) => {
      iframe.addEventListener('load', () => resolve(), { once: true })
      iframe.addEventListener('error', reject, { once: true })
      iframe.srcdoc = html
    })

    // Send capture command and wait for the data URL response
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Capture timed out')), 30000)

      function handler(e: MessageEvent) {
        if (e.data?.type !== '__pdf_capture_result__') return
        clearTimeout(timeout)
        window.removeEventListener('message', handler)
        if (e.data.error) reject(new Error(e.data.error))
        else resolve(e.data.dataUrl)
      }
      window.addEventListener('message', handler)

      // Tell the iframe to start capturing
      iframe.contentWindow!.postMessage('__pdf_capture__', '*')
    })

    return dataUrl
  } finally {
    document.body.removeChild(iframe)
  }
}

/** Convert a base64 data URL to a Uint8Array of raw bytes. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64    = dataUrl.split(',')[1] ?? ''
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Screenshot-based PDF export — uses html2canvas (in-browser, screen mode).
 * Does NOT call Puppeteer. Checkboxes, signatures, and all visible elements
 * are captured exactly as the browser renders them — same as the preview iframe.
 *
 * Use this when Puppeteer export produces blank checkboxes or missing signatures.
 */
export async function exportToPdfCanvas(
  pages:       ExportPage[],
  title:       string,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(title)

  const sourceCache = new Map<string, Uint8Array>()

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!
    const wMm  = page.widthMm  ?? 210
    const hMm  = page.heightMm ?? 297
    const wPt  = wMm * MM_TO_PT
    const hPt  = hMm * MM_TO_PT

    if (page.pdfSourceUrl && page.pdfSourcePage !== undefined) {
      // PDF pages: copy directly at vector quality (same as Puppeteer path)
      let srcBytes = sourceCache.get(page.pdfSourceUrl)
      if (!srcBytes) {
        const resp = await fetch(page.pdfSourceUrl)
        if (!resp.ok) throw new Error(`Failed to fetch PDF: ${page.pdfSourceUrl}`)
        srcBytes = new Uint8Array(await resp.arrayBuffer())
        sourceCache.set(page.pdfSourceUrl, srcBytes)
      }
      const srcDoc = await PDFDocument.load(srcBytes)
      const [copied] = await pdfDoc.copyPages(srcDoc, [page.pdfSourcePage - 1])
      pdfDoc.addPage(copied!)
    } else {
      // HTML form: screenshot via html2canvas (screen mode — checkboxes render correctly)
      const widthPx  = Math.round(wMm * 96 / 25.4)
      const heightPx = Math.round(hMm * 96 / 25.4)
      const preparedHtml = await prepareHtmlForPdf(page.html)
      const dataUrl  = await renderHtmlToCanvas(preparedHtml, widthPx, heightPx)
      const pngBytes = dataUrlToBytes(dataUrl)
      const pngImage = await pdfDoc.embedPng(pngBytes)
      const pdfPage  = pdfDoc.addPage([wPt, hPt])
      pdfPage.drawImage(pngImage, { x: 0, y: 0, width: wPt, height: hPt })
    }

    onProgress?.((i + 1) / pages.length)
  }

  const bytes = await pdfDoc.save()
  triggerDownload(bytes, `${sanitiseFilename(title)}.pdf`, 'application/pdf')
}

/** Trigger a browser file download for a Uint8Array. */
function triggerDownload(data: Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 15_000)
}

/** Strip characters that are unsafe in filenames. */
function sanitiseFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 120)
}
