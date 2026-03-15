-- Rename status: external_request title 'External Inspection' → 'ITR Requested'
UPDATE public.itr_statuses
SET title = 'ITR Requested',
    updated_at = NOW()
WHERE code = 'external_request';
