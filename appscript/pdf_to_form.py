#!/usr/bin/env python3
"""
pdf_to_form.py — Convert PDF template with {{tag}} placeholders → PDF AcroForm

Requirements:
    pip install pymupdf

Usage:
    python pdf_to_form.py input.pdf output_form.pdf
    python pdf_to_form.py input.pdf output_form.pdf --fontsize 11
    python pdf_to_form.py input.pdf output_form.pdf --show-borders

How it works:
    1. Scan every page for text matching {{fieldname}}
    2. White-out the placeholder text
    3. Place a PDF text field (AcroForm widget) at the same location
    4. The field name = the tag name (e.g. {{itrNo}} → field "itrNo")

After this you fill the form with pdf-lib (JS) or pdf-lib (Python):
    form.getTextField('itrNo').setText('CHN1A-E-ITR-0001')
"""

import fitz  # pymupdf
import re
import sys
import argparse


# ─────────────────────────────────────────────────────────────────────────────
#  Core converter
# ─────────────────────────────────────────────────────────────────────────────

def convert_to_form(
    input_path: str,
    output_path: str,
    default_fontsize: float = 0,   # 0 = auto-fit by PyMuPDF
    show_borders: bool = False,
    expand_right: float = 60,       # extra px added to right of field rect
):
    """
    Convert PDF template placeholders ({{tag}}) to AcroForm text fields.

    Parameters
    ----------
    input_path      : source PDF file
    output_path     : output PDF with form fields
    default_fontsize: fixed font size for all fields (0 = auto)
    show_borders    : draw visible border around each field (helpful for debugging)
    expand_right    : pixels to extend field rect to the right (room to type)
    """
    doc = fitz.open(input_path)
    total_fields = 0

    for page_num, page in enumerate(doc):
        full_text = page.get_text()

        # Collect unique tag names on this page
        tags = list(dict.fromkeys(re.findall(r'\{\{(\w+)\}\}', full_text)))

        if not tags:
            continue

        print(f"\nPage {page_num + 1}:")
        print(f"  Tags found : {tags}")

        # Pass 1: collect rect positions, then redact all at once
        tag_rects = {}
        for tag in tags:
            pattern = '{{' + tag + '}}'
            rects = page.search_for(pattern, quads=False)
            if not rects:
                # PyMuPDF sometimes fails to find glued glyphs; try partial search
                rects = page.search_for(tag, quads=False)
            if rects:
                tag_rects[tag] = rects
                for rect in rects:
                    # Mark for permanent deletion (no white box drawn separately)
                    page.add_redact_annot(rect, fill=(1, 1, 1))
            else:
                print(f"  ⚠  Cannot locate '{pattern}' — skipped")

        # Apply redactions — text is now permanently removed from PDF stream
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

        # Pass 2: place AcroForm widgets using saved rects (text already gone)
        for tag, rects in tag_rects.items():
            for rect in rects:

                # ── Build field rectangle (slightly expanded) ─────────────
                field_rect = fitz.Rect(
                    rect.x0,
                    rect.y0 - 1,
                    rect.x1 + expand_right,
                    rect.y1 + 1,
                )

                # ── Create AcroForm text field widget ────────────────────────
                widget = fitz.Widget()
                widget.rect          = field_rect
                widget.field_type    = fitz.PDF_WIDGET_TYPE_TEXT
                widget.field_name    = tag
                widget.field_value   = ""
                widget.text_fontsize = default_fontsize
                widget.text_color    = (0, 0, 0)           # black text
                widget.fill_color    = (1, 1, 1)           # white background
                # Border: show thin grey line when debugging, else transparent
                if show_borders:
                    widget.border_color = (0.4, 0.4, 0.8)
                    widget.border_width = 0.8
                else:
                    widget.border_color = (1, 1, 1)        # invisible border
                    widget.border_width = 0

                page.add_widget(widget)
                total_fields += 1
                print(f"  ✓  '{tag}'  @ {rect}")

    print(f"\nTotal form fields created : {total_fields}")

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    print(f"Saved → {output_path}")


# ─────────────────────────────────────────────────────────────────────────────
#  Fill helper (bonus: fill and flatten in one step)
# ─────────────────────────────────────────────────────────────────────────────

def fill_and_flatten(
    form_pdf_path: str,
    output_path: str,
    data: dict,
):
    """
    Fill a PDF form (created by convert_to_form) with data and flatten it to
    a normal non-editable PDF.

    Parameters
    ----------
    form_pdf_path : path to the form PDF produced by convert_to_form()
    output_path   : path for the filled+flattened PDF
    data          : dict  { fieldName: value }

    Example
    -------
    fill_and_flatten(
        'itr_form.pdf',
        'itr_filled.pdf',
        {
            'itrNo'        : 'CHN1A-E-ITR-0001',
            'discipline'   : 'Electrical',
            'area'         : 'Area A',
            'issueDate'    : '28/02/2026',
            'confirmedDate': '01/03/2026',
            'title'        : 'Cable Tray Installation',
            'location'     : 'B1F – Room 101',
            'dwgNo'        : 'CHN1A-E-DWG-0001',
        }
    )
    """
    doc = fitz.open(form_pdf_path)

    for page in doc:
        for widget in page.widgets():
            if widget.field_name in data:
                widget.field_value = str(data[widget.field_name])
                widget.update()

    # Flatten = bake field values into normal PDF content
    doc.save(output_path, garbage=4, deflate=True)

    # Re-open and flatten widgets
    doc2 = fitz.open(output_path)
    for page in doc2:
        widgets = list(page.widgets())
        for w in widgets:
            page.delete_widget(w)
    tmp_path = output_path.replace('.pdf', '_flat.pdf')
    doc2.save(tmp_path, garbage=4, deflate=True)
    doc2.close()
    doc.close()

    import os
    os.replace(tmp_path, output_path)
    print(f"Filled & flattened → {output_path}")


# ─────────────────────────────────────────────────────────────────────────────
#  CLI
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Convert PDF {{tag}} placeholders to AcroForm fields'
    )
    parser.add_argument('input',  help='Source PDF file with {{tag}} placeholders')
    parser.add_argument('output', help='Output PDF with form fields')
    parser.add_argument('--fontsize',      type=float, default=0,
                        help='Fixed font size for all fields (default: 0 = auto)')
    parser.add_argument('--show-borders',  action='store_true',
                        help='Show visible borders around fields (for debugging)')
    parser.add_argument('--expand-right',  type=float, default=60,
                        help='Extra width (px) added to right of field rect (default: 60)')

    args = parser.parse_args()

    print(f"Input  : {args.input}")
    print(f"Output : {args.output}")

    convert_to_form(
        input_path      = args.input,
        output_path     = args.output,
        default_fontsize= args.fontsize,
        show_borders    = args.show_borders,
        expand_right    = args.expand_right,
    )


if __name__ == '__main__':
    main()
