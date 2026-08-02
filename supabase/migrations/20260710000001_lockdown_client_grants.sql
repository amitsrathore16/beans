-- Lock down what the `authenticated` role (PostgREST calls straight from the
-- browser) may write. Previously it had full INSERT/UPDATE/DELETE on all three
-- tables, which made the backend's invariants bypassable from the client:
--   * beans.remaining_weight_g could be set directly, skipping the decrease-only
--     rule and the inventory_events ledger.
--   * logs' locked extraction fields (dose_g, yields, ratio) could be edited
--     directly, bypassing the PATCH /logs lock.
--   * inventory_events could be inserted/edited/deleted — the "immutable
--     append-only ledger" was neither.
--
-- Stock changes and the ledger now flow ONLY through the service-role RPCs
-- (deduct_bean_stock / adjust_bean_stock) and backend endpoints.
-- service_role keeps GRANT ALL, so the FastAPI backend is unaffected.

-- ── beans ──────────────────────────────────────────────────────────────────
-- Client may edit metadata and soft-delete, but NOT remaining_weight_g.
-- (INSERT is left intact: creating a bag with an initial weight is legitimate,
--  same as typing the bag size.)
REVOKE UPDATE, DELETE ON public.beans FROM authenticated;
GRANT  UPDATE (
    name, roaster, origin, roast_level, process_method,
    roast_date, opened_date, total_weight_g, photo_url, deleted_at
) ON public.beans TO authenticated;

-- ── logs ───────────────────────────────────────────────────────────────────
-- Client may read and soft-delete only. Create/edit go through the backend,
-- which enforces the extraction/quantity lock.
REVOKE INSERT, UPDATE, DELETE ON public.logs FROM authenticated;
GRANT  UPDATE (deleted_at) ON public.logs TO authenticated;

-- ── inventory_events ───────────────────────────────────────────────────────
-- Truly append-only from the client's side: read only. All writes are backend.
REVOKE INSERT, UPDATE, DELETE ON public.inventory_events FROM authenticated;
