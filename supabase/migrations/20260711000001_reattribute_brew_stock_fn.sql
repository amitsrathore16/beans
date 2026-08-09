-- Move a brew's inventory deduction from one bean to another when its
-- coffee_name is edited. Refunds the old bean and (if a new bean is given)
-- deducts the same locked dose from it — atomically, with row locks, and
-- appends the ledger rows. If the new bean has insufficient stock, nothing is
-- changed and success=false (caller maps to 422).
--
--   p_new_bean_id NULL  -> refund only (edited name matched no bean)
--
-- Returns success=false when a bean is missing or the new bean lacks stock.

CREATE OR REPLACE FUNCTION reattribute_brew_stock(
    p_log_id      UUID,
    p_user_id     UUID,
    p_old_bean_id UUID,
    p_new_bean_id UUID,
    p_dose_g      NUMERIC
)
RETURNS TABLE(success BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_old_before NUMERIC; v_old_after NUMERIC;
    v_new_before NUMERIC; v_new_after NUMERIC;
BEGIN
    -- ponytail: lock both rows unconditionally in a fixed order (bean id) to
    -- avoid deadlocks under concurrent edits; low volume, but cheap insurance.
    PERFORM 1 FROM beans
     WHERE id IN (p_old_bean_id, p_new_bean_id) AND user_id = p_user_id
     ORDER BY id FOR UPDATE;

    SELECT remaining_weight_g INTO v_old_before
      FROM beans WHERE id = p_old_bean_id AND user_id = p_user_id;
    IF NOT FOUND THEN RETURN QUERY SELECT FALSE; RETURN; END IF;

    IF p_new_bean_id IS NOT NULL THEN
        SELECT remaining_weight_g INTO v_new_before
          FROM beans WHERE id = p_new_bean_id AND user_id = p_user_id;
        IF NOT FOUND THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
        IF v_new_before < p_dose_g THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
    END IF;

    -- Refund the old bean.
    v_old_after := v_old_before + p_dose_g;
    UPDATE beans SET remaining_weight_g = v_old_after
      WHERE id = p_old_bean_id AND user_id = p_user_id;
    INSERT INTO inventory_events(user_id, bean_id, log_id, delta_g, weight_before_g, weight_after_g, source)
      VALUES (p_user_id, p_old_bean_id, p_log_id, p_dose_g, v_old_before, v_old_after, 'brew_edit_reverse');

    -- Deduct the new bean (unless the name matched nothing).
    IF p_new_bean_id IS NOT NULL THEN
        v_new_after := v_new_before - p_dose_g;
        UPDATE beans SET remaining_weight_g = v_new_after
          WHERE id = p_new_bean_id AND user_id = p_user_id;
        INSERT INTO inventory_events(user_id, bean_id, log_id, delta_g, weight_before_g, weight_after_g, source)
          VALUES (p_user_id, p_new_bean_id, p_log_id, -p_dose_g, v_new_before, v_new_after, 'brew_save');
    END IF;

    RETURN QUERY SELECT TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION reattribute_brew_stock(UUID, UUID, UUID, UUID, NUMERIC) TO service_role;
