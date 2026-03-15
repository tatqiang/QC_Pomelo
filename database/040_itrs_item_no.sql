-- 040: Add item_no column to itrs for internal running number control
-- Separate from itr_number which is the external document number filled by external team
-- Format: ITR-{DISC}-A001...A999->B001  /  MIR-{DISC}-A001 for Material Inspection type

ALTER TABLE public.itrs
  ADD COLUMN IF NOT EXISTS item_no text NULL;

COMMENT ON COLUMN public.itrs.item_no IS
  'Internal running number (e.g. ITR-M-A001, MIR-FP-A001). Auto-generated on creation.';
