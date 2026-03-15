# Tag Manual — `convert_sheet_to_form.py`

Convert an Excel template with `{{tags}}` into a fillable AcroForm PDF.

---

## Syntax Rule

Every tag is written as the sole content of a cell in your Excel file.
Segments are separated by `:` in this fixed order:

```
{{type:name:N:S.s:a}}
```

| Segment | Meaning | Example |
|---------|---------|---------|
| `type`  | Field type — see list below | `txt` |
| `name`  | Field name — letters, digits, `_` only | `itrNo` |
| `N`     | *(ml only)* Number of lines tall *(integer)* | `3` |
| `S.s`   | *(ml only)* Spacing multiplier *(must have `.`)* | `2.0` |
| `a`     | Alignment: `l` left · `c` center · `r` right | `c` |

All segments except `type` and `name` are optional.
The parser tells them apart by shape: **integer = lines**, **decimal = spacing**, **letter = alignment**.

---

## Field Types

### `{{txt:name}}` — Single-line text

```
{{txt:invoiceNo}}
{{txt:invoiceNo:c}}        center-aligned
{{txt:invoiceNo:r}}        right-aligned
{{txt:invoiceNo:l}}        left-aligned (explicit)
```

- Field width matches the Excel cell border
- Font and font size are read from the cell span
- Alignment is auto-detected from cell position if not specified

---

### `{{ml:name}}` — Multi-line text

```
{{ml:title}}               auto height — finds bottom border of cell
{{ml:title:3}}             exactly 3 lines tall
{{ml:title:3:c}}           3 lines, centered
{{ml:title:3:2.0}}         3 lines, each slot 2× fontsize tall
{{ml:title:3:2.0:c}}       3 lines, 2× tall slots, centered
{{ml:title:2.0}}           auto height from border, spacing stored
{{ml:title:c}}             auto height, centered
```

**Height calculation:**

| Tag | Box height formula |
|-----|--------------------|
| `{{ml:title:3}}` | `3 × font × 1.25 + 4 pt` |
| `{{ml:title:3:2.0}}` | `3 × font × 2.0 + 4 pt` |

> **Note on line spacing:** PDF viewers (Acrobat, Chrome, Edge) always render
> text at their own fixed internal line height (~1.25× font size). The `:S.s`
> multiplier controls the *box height per line slot*, giving more vertical
> space between typed lines, but cannot force the viewer to render text at a
> custom spacing. The value is stored in the field-map JSON for reference.

---

### `{{chk:name}}` — Checkbox

```
{{chk:approved}}
{{chk:isComplete}}
```

- Renders a 12 × 12 pt checkbox at the top-left corner of the cell
- White fill, grey border
- User clicks to check / uncheck in any PDF viewer

---

### `{{sig:name}}` — Signature box

```
{{sig:sig_mep}}
{{sig:sig_qc}}
```

- Draws a light-grey rectangle filling the cell
- The PWA fills this by drawing a base64 image over the field at runtime
- Field is **readonly** — not directly editable by the PDF user
- Recommended naming convention: prefix with `sig_` (e.g. `sig_mep`, `sig_client`)

---

### `{{photo:name}}` — Image / photo placeholder

```
{{photo:photo_1}}
{{photo:site_photo}}
{{photo:diagram}}
```

- Draws a visible dashed grey rectangle with a mountain-and-sun icon
- **No AcroForm widget** — the PWA injects the actual image at fill time by reading the `rect` from the field-map JSON
- The placeholder is replaced entirely by the image; it does not scroll or clip
- Name it anything; prefix `photo_` is conventional but not required

---

### `{{date:name}}` — Date field

```
{{date:issueDate}}
{{date:issueDate:c}}
{{date:issueDate:r}}
```

- Identical to `txt` in the rendered PDF — single-line, same font/size/alignment rules
- Tagged as `date` in the field-map JSON so the PWA can render a date picker

---

### `{{name}}` — Plain shorthand

```
{{itrNo}}            → txt, left (auto-align)
{{itrNo:c}}          → txt, center
{{itrNo:r}}          → txt, right
{{itrNo:l}}          → txt, left (explicit)
```

- Treated as `{{txt:name:a}}` — single-line text, auto font
- Fastest to type; alignment suffix is optional

---

## Segment Disambiguation Cheat-Sheet

| You write | Parsed as | Meaning |
|-----------|-----------|---------|
| `:3` | integer → **N lines** | 3 lines tall |
| `:2.0` | decimal → **spacing** | 2.0× fontsize per slot |
| `:c` | letter → **alignment** | center |
| `:3:c` | N + align | 3 lines, centered |
| `:3:2.0` | N + spacing | 3 lines, 2× tall slots |
| `:3:2.0:c` | N + spacing + align | full control |

---

## Field-Map JSON Output

Every conversion produces a `*_fieldmap.json` alongside the PDF.
Each field entry:

```json
{
  "type":        "ml",
  "page":        0,
  "rect":        [68.4, 340.0, 207.6, 392.5],
  "fontsize":    12.9,
  "font":        "Helv",
  "align":       0,
  "lines":       3,
  "lineSpacing": 2.0
}
```

| Key | Description |
|-----|-------------|
| `type` | `txt` / `ml` / `chk` / `sig` / `photo` / `date` |
| `page` | 0-based page index |
| `rect` | `[x0, y0, x1, y1]` in PDF points |
| `fontsize` | Matched from Excel cell (pt) |
| `font` | Mapped PDF standard font name |
| `align` | `0` left · `1` center · `2` right |
| `lines` | Line count (null if auto from border) |
| `lineSpacing` | Spacing multiplier (null if default) |

---

## Supported Fonts

AcroForm fields only support the 14 standard PDF fonts.
Excel/LibreOffice fonts are mapped to the closest match:

| Excel / LibreOffice font | PDF font (`font` key) |
|--------------------------|-----------------------|
| Calibri, Arial, Helvetica, Tahoma, Verdana, Trebuchet | `Helv` (Helvetica) |
| Times New Roman, Georgia | `TiRo` (Times-Roman) |
| Courier New, Consolas, Courier | `Cour` (Courier) |

---

## Batch Conversion

```bat
cd QC_JEC_V2\appscript
convert_all.bat
```

Converts every `*.xlsx` in the folder → `*_form.pdf` + `*_fieldmap.json`.
After conversion it offers to upload all `*_form.pdf` files to R2 via `upload_template.py`.

---

## Single File Conversion

```bat
py convert_sheet_to_form.py input.xlsx output_form.pdf
py convert_sheet_to_form.py input.pdf  output_form.pdf
```

---

## PWA Usage  `fillPdfTemplate.ts`

Located at `src/utils/fillPdfTemplate.ts`.
Requires **pdf-lib** (`npm install pdf-lib`).

### Functions

| Function | Purpose |
|---|---|
| `fillPdfTemplate(templateUrl, fieldmapUrl, values)` | Returns `Uint8Array` of the filled PDF |
| `previewFilledPdf(...)` | Fills and opens in a new browser tab |
| `downloadFilledPdf(..., filename)` | Fills and triggers a download |

### Field value types

| Tag type | Value type |
|---|---|
| `txt` / `ml` / `date` | `string` |
| `chk` | `boolean` or `'true'` / `'1'` |
| `sig` / `photo` | URL string **or** base64 data URL (JPEG or PNG) |

### Example

```typescript
import { previewFilledPdf } from '@/utils/fillPdfTemplate'

const TEMPLATE = import.meta.env.VITE_TEMPLATE_ITR_FORM
const FIELDMAP  = import.meta.env.VITE_FIELDMAP_ITR_FORM

await previewFilledPdf(TEMPLATE, FIELDMAP, {
  projectName:       'Offshore Platform A',
  tagNumber:         'TAG-001',
  inspectionDate:    '2025-06-15',
  accepted:          true,
  signatureInspector: signatureDataUrl,
  sitePhoto1:        photoDataUrl,
})
```

### How photo / sig fields work

`photo` and `sig` tags have **no AcroForm widget** in the PDF.
The fieldmap contains their `rect: [x0, y0, x1, y1]` (PyMuPDF top-left origin).

`fillPdfTemplate` handles the coordinate flip:
```
pdfLibY = pageHeight - rect[3]   // bottom-left origin for pdf-lib
```

The image is scaled to fit (`scaleToFit`) and centred within the rect.
