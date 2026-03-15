# HTML Checklist Implementation Plan
**Project:** QC_JEC_V2 — Replace PDF Checklists with HTML Forms  
**Date:** 2026-03-04  
**Status:** Planning

---

## Overview

Replace PDF-based checklist uploads on ITP/ITR with self-contained HTML forms.  
HTML forms use `data-key` attributes for field binding, support in-browser fill + print, and save structured data to Supabase JSONB columns.

### Key Rules
- **1 ITP** → many HTML checklist templates
- **1 ITR** → 1 ITP selected + many checklists selected (only from that ITP)
- **1 ITR** → many basic forms (ITR Cover, Photo Report) — independent of ITP
- HTML forms are stored as inline `html_content` TEXT (self-contained, no external deps)
- Form rendering uses `<iframe srcdoc>` — sandboxed, native CSS/JS, print works out-of-the-box
- Field injection via `postMessage` bridge (iframe ↔ parent Vue app)

---

## Data Model

### Existing Tables (relevant columns)

```
itps
  id, project_id, discipline_id, doc_no, title, last_revision, revision_date, status

itrs
  id, project_id, task_id, area_id, itr_number, title, location, discipline, status
  form_data jsonb   ← existing, used for basic forms

itp_files
  id, itp_id, file_name, file_url, file_category ('itp' | 'checklist')  ← PDF era, keep for now

master_forms / master_form_revisions   ← PDF AcroForm templates, migrate to HTML in Phase 5
```

### New Tables

#### `033_itp_html_checklists.sql`
```sql
CREATE TABLE public.itp_html_checklists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itp_id        uuid NOT NULL REFERENCES public.itps(id) ON DELETE CASCADE,
  code          text NOT NULL,           -- 'EE-002', 'GR-01'
  title         text NOT NULL,           -- 'Grounding Inspection Report'
  discipline    text NULL,               -- 'E', 'M', 'FP'
  html_content  text NOT NULL,           -- full HTML file stored inline
  field_schema  jsonb NULL,              -- auto-extracted data-key list
  version       text NOT NULL DEFAULT 'Rev0',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itp_html_checklists_itp_code_uniq UNIQUE (itp_id, code)
);
CREATE INDEX idx_itp_html_checklists_itp_id ON public.itp_html_checklists (itp_id);
```

#### `034_itp_id_on_itrs.sql`
```sql
ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS itp_id uuid NULL REFERENCES public.itps(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_itrs_itp_id ON public.itrs (itp_id);
```

#### `035_itr_checklist_selections.sql`
```sql
CREATE TABLE public.itr_checklist_selections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itr_id         uuid NOT NULL REFERENCES public.itrs(id) ON DELETE CASCADE,
  checklist_id   uuid NOT NULL REFERENCES public.itp_html_checklists(id),
  display_order  int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itr_checklist_sel_uniq UNIQUE (itr_id, checklist_id)
);
CREATE INDEX idx_itr_checklist_sel_itr_id ON public.itr_checklist_selections (itr_id);
```

#### `036_itr_checklist_responses.sql`
```sql
CREATE TABLE public.itr_checklist_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id  uuid NOT NULL REFERENCES public.itr_checklist_selections(id) ON DELETE CASCADE,
  form_data     jsonb NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  submitted_at  timestamptz NULL,
  submitted_by  uuid NULL REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_itr_checklist_resp_sel_id ON public.itr_checklist_responses (selection_id);
```

---

## HTML Form Convention

### `data-key` Naming Rules

| Prefix | Source | Behavior |
|--------|--------|----------|
| `sys:itr_number` | `itrs.itr_number` | Auto-injected, readonly |
| `sys:area` | `areas.name` | Auto-injected, readonly |
| `sys:location` | `itrs.location` | Auto-injected, readonly |
| `sys:title` | `itrs.title` | Auto-injected, readonly |
| `sys:project_name` | `projects.name` | Auto-injected, readonly |
| `sys:discipline` | `disciplines.name` | Auto-injected, readonly |
| `sys:inspection_date` | `itrs.inspection_date` | Auto-injected, editable |
| *(no prefix)* | User input | Saved to `form_data` JSONB |

### Example HTML field markup
```html
<!-- System fields (auto-filled) -->
<input type="text" data-key="sys:itr_number" readonly>
<input type="text" data-key="sys:area" readonly>
<input type="text" data-key="sys:location" readonly>

<!-- User-filled fields -->
<input type="text" data-key="report-no" placeholder="">
<input type="text" data-key="form-date" placeholder="DD/MM/YYYY">
```

### postMessage Bridge Protocol
```js
// Parent → iframe: inject context
iframe.contentWindow.postMessage({
  type: 'INJECT_FIELDS',
  payload: { 'sys:itr_number': 'ITR-001', 'sys:area': 'Zone-A', ... }
}, '*')

// Parent → iframe: request save
iframe.contentWindow.postMessage({ type: 'REQUEST_SAVE' }, '*')

// iframe → parent: form data ready
window.parent.postMessage({
  type: 'FORM_DATA',
  payload: { 'report-no': 'GR-001', 'form-date': '04/03/2026', ... }
}, '*')
```

---

## Execution Phases

### ✅ Phase 0 — Already Done
- [x] `itp_files` table with `file_category` ('itp' | 'checklist')
- [x] `master_forms` / `master_form_revisions` (PDF era)
- [x] `itrs.form_data` JSONB column
- [x] ITP modal UI (Edit ITP Record — see image)
- [x] HTML checklist example: `htmlForms/ITP_submission/E/Grounding/EE-002_Grounding_Inspection.html`

---

### 🔲 Phase 1 — Database Migrations
**Goal:** Create new tables, add `itp_id` to `itrs`  
**Risk:** Low — additive only, no existing data affected

**Tasks:**
- [x] Write `033_itp_html_checklists.sql`
- [x] Write `034_itp_id_on_itrs.sql`
- [x] Write `035_itr_checklist_selections.sql`
- [x] Write `036_itr_checklist_responses.sql`
- [x] RLS policies included in each migration file
- [ ] **Run all 4 migrations in Supabase Dashboard → SQL Editor** *(in order)*
- [ ] Update Supabase TypeScript types (`supabase gen types`)

**Files to create:**
```
QC_JEC_V2/database/033_itp_html_checklists.sql
QC_JEC_V2/database/034_itp_id_on_itrs.sql
QC_JEC_V2/database/035_itr_checklist_selections.sql
QC_JEC_V2/database/036_itr_checklist_responses.sql
```

---

### 🔲 Phase 2 — ITP Modal: HTML Checklist Manager
**Goal:** Replace PDF checklist upload with HTML form registration  
**Touches:** `ITPsView.vue` (Edit ITP modal — "Checklists" section)

**Tasks:**
- [ ] Add "Checklists" tab/section in Edit ITP modal (replace file upload)
- [ ] Upload HTML file → read as text → parse `data-key` attributes → build `field_schema`
- [ ] Store via `INSERT INTO itp_html_checklists` (html_content, field_schema, code, title)
- [ ] List registered checklists: code | title | version | actions
- [ ] Preview button → opens html in full-screen iframe modal
- [ ] Edit metadata (code, title, version) inline
- [ ] Delete checklist (with confirmation)

**New components:**
```
src/components/itp/ChecklistUploadPanel.vue
src/components/itp/ChecklistListItem.vue
src/components/shared/HtmlPreviewModal.vue
```

**Store additions:**
```
src/stores/itpChecklists.ts   (CRUD for itp_html_checklists)
```

---

### 🔲 Phase 3 — ITR Modal: ITP + Checklist Selector
**Goal:** Link ITR → ITP, then select checklists from that ITP  
**Touches:** `ITRsView.vue` (Edit/Create ITR modal)

**Tasks:**
- [ ] Add "ITP" dropdown to ITR form (filtered by discipline, project)
- [ ] On ITP select → load `itp_html_checklists` for that ITP
- [ ] "Checklists" multi-select: show code + title, checkbox per checklist
- [ ] Validate: cannot select checklists from a different ITP
- [ ] Save: `itr.itp_id` + rows in `itr_checklist_selections`
- [ ] Show checklist count badge on ITR list rows

**Store additions:**
```
src/stores/itrChecklistSelections.ts
```

---

### 🔲 Phase 4 — HTML Form Filler (Core Feature)
**Goal:** Open a selected checklist, auto-fill system fields, user fills, save + print  
**This is the main user-facing feature**

**Tasks:**
- [ ] `HtmlFormFiller.vue` modal/panel component
  - [ ] Render checklist HTML inside `<iframe srcdoc="…">`
  - [ ] Inject `postMessage` bridge script into HTML before rendering
  - [ ] Auto-inject `sys:` fields from ITR context on load
  - [ ] Restore previously saved `form_data` on open
  - [ ] "Save Draft" → serialize all `data-key` values → upsert `itr_checklist_responses`
  - [ ] "Submit" → same + set `status = 'submitted'`, lock editing
  - [ ] "Print" → call `iframe.contentWindow.print()`
  - [ ] "Unlock" (admin) → set `status = 'draft'` again
- [ ] Show completion status indicator per checklist in ITR view
- [ ] Add `updated_at` trigger on `itr_checklist_responses`

**New components:**
```
src/components/itr/HtmlFormFiller.vue
src/components/itr/ChecklistStatusBadge.vue
```

---

### 🔲 Phase 5 — Basic Forms as HTML (ITR Cover, Photo Report)
**Goal:** Migrate ITR Cover and Photo Report from PDF AcroForm to HTML  
**Depends on:** Phase 4 complete (HtmlFormFiller already exists)

**Tasks:**
- [ ] Create `htmlForms/basic_forms/ITR_cover/itr_cover.html` with `data-key` convention
- [ ] Create `htmlForms/basic_forms/Photo_report/photo_report.html`
- [ ] Update `master_form_revisions` to add `html_content` column alongside existing `template_url`
- [ ] Render basic forms through same `HtmlFormFiller.vue` component
- [ ] `itrs.form_data` JSONB → keep as fallback / migrate to `itr_checklist_responses` long-term

**New DB migration:**
```
QC_JEC_V2/database/037_master_forms_html_content.sql
  ALTER TABLE master_form_revisions ADD COLUMN IF NOT EXISTS html_content text NULL;
```

---

## File / Component Map

```
QC_JEC_V2/
├── database/
│   ├── 033_itp_html_checklists.sql       ← Phase 1
│   ├── 034_itp_id_on_itrs.sql            ← Phase 1
│   ├── 035_itr_checklist_selections.sql  ← Phase 1
│   ├── 036_itr_checklist_responses.sql   ← Phase 1
│   └── 037_master_forms_html_content.sql ← Phase 5
│
├── src/
│   ├── stores/
│   │   ├── itpChecklists.ts              ← Phase 2
│   │   └── itrChecklistSelections.ts     ← Phase 3
│   │
│   ├── components/
│   │   ├── itp/
│   │   │   ├── ChecklistUploadPanel.vue  ← Phase 2
│   │   │   └── ChecklistListItem.vue     ← Phase 2
│   │   ├── itr/
│   │   │   ├── HtmlFormFiller.vue        ← Phase 4 (core)
│   │   │   └── ChecklistStatusBadge.vue  ← Phase 4
│   │   └── shared/
│   │       └── HtmlPreviewModal.vue      ← Phase 2
│   │
│   └── views/
│       ├── ITPsView.vue                  ← Phase 2 (modify)
│       └── ITRsView.vue                  ← Phase 3 (modify)
│
└── htmlForms/
    ├── ITP_submission/
    │   └── E/Grounding/EE-002_Grounding_Inspection.html  ← Existing example
    └── basic_forms/
        ├── ITR_cover/itr_cover.html      ← Phase 5 (create)
        └── Photo_report/photo_report.html ← Phase 5 (create)
```

---

## Progress Tracker

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| 0 | Existing baseline | ✅ Done | |
| 1 | DB Migrations | � SQL written — run in Supabase | Run 033→036 in order |
| 2 | ITP Checklist Manager | 🔲 Not started | |
| 3 | ITR ITP + Checklist Selector | 🔲 Not started | |
| 4 | HTML Form Filler | 🔲 Not started | |
| 5 | Basic Forms as HTML | 🔲 Not started | |

---

## Open Questions

- [ ] Should `html_content` be stored in Supabase TEXT or uploaded to R2? *(Recommendation: Supabase TEXT for forms < 500KB, R2 for larger)*
- [ ] Who can upload/edit checklists? All users or admin only?
- [ ] Should submitted responses be immutable (lock db row) or allow re-open?
- [ ] Multiple responses per checklist per ITR? *(e.g. re-inspection)* Or only 1?
- [ ] Signature fields in HTML forms — store as base64 in `form_data` JSONB?
