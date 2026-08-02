-- Manual inventory adjustment (user edits a bean's remaining weight).
-- Mirrors deduct_bean_stock: locks the row, enforces the rule atomically.
--
-- Business rule: inventory can only be REDUCED via a manual edit. A new weight
-- equal to or greater than the current one is rejected (success=false), so the
-- caller can show a "can't increase inventory" message.
--
-- Returns:
--   (remaining, before, success=true)  – decrease applied
--   (remaining, before, success=false) – new weight >= current (not allowed)
--   empty result set                   – bean not found / wrong owner

CREATE OR REPLACE FUNCTION adjust_bean_stock(
    p_bean_id      UUID,
    p_user_id      UUID,
    p_new_weight_g NUMERIC
)
RETURNS TABLE(remaining_weight_g NUMERIC, weight_before_g NUMERIC, success BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_before NUMERIC;
BEGIN
    SELECT b.remaining_weight_g INTO v_before
    FROM   beans b
    WHERE  b.id = p_bean_id AND b.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Only decreases allowed.
    IF p_new_weight_g >= v_before THEN
        RETURN QUERY SELECT v_before, v_before, FALSE;
        RETURN;
    END IF;

    UPDATE beans
    SET    remaining_weight_g = p_new_weight_g
    WHERE  id = p_bean_id AND user_id = p_user_id;

    RETURN QUERY SELECT p_new_weight_g, v_before, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_bean_stock(UUID, UUID, NUMERIC) TO service_role;
