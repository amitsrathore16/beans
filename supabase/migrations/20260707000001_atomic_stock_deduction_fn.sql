-- Atomic stock deduction function.
-- Replaces the Python read-then-update pattern that was vulnerable to a
-- TOCTOU race condition under concurrent brew-saves.
--
-- Uses SELECT ... FOR UPDATE to lock the bean row for the duration of the
-- transaction, then checks and deducts in a single atomic operation.
--
-- Returns:
--   (remaining_weight_g, weight_before_g, success=true)  – deduction succeeded
--   (remaining_weight_g, weight_before_g, success=false) – insufficient stock
--   empty result set                                      – bean not found / wrong owner

CREATE OR REPLACE FUNCTION deduct_bean_stock(
    p_bean_id UUID,
    p_user_id UUID,
    p_dose_g   NUMERIC
)
RETURNS TABLE(remaining_weight_g NUMERIC, weight_before_g NUMERIC, success BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER   -- runs as the calling role (service_role from FastAPI)
AS $$
DECLARE
    v_before NUMERIC;
    v_after  NUMERIC;
BEGIN
    -- Lock the row; other concurrent calls block here until the transaction commits.
    SELECT b.remaining_weight_g INTO v_before
    FROM   beans b
    WHERE  b.id      = p_bean_id
      AND  b.user_id = p_user_id
    FOR UPDATE;

    -- Bean not found or wrong owner → return empty (caller maps to 404)
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Insufficient stock → return current weight + success=false (caller maps to 422)
    IF v_before < p_dose_g THEN
        RETURN QUERY SELECT v_before, v_before, FALSE;
        RETURN;
    END IF;

    v_after := v_before - p_dose_g;

    UPDATE beans
    SET    remaining_weight_g = v_after
    WHERE  id      = p_bean_id
      AND  user_id = p_user_id;

    RETURN QUERY SELECT v_after, v_before, TRUE;
END;
$$;

-- Allow the service_role (used by FastAPI) to execute this function.
GRANT EXECUTE ON FUNCTION deduct_bean_stock(UUID, UUID, NUMERIC) TO service_role;
