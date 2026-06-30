CREATE TABLE inventory_events (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id),
  bean_id         UUID          NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
  log_id          UUID          REFERENCES logs(id),
  delta_g         NUMERIC(8,2)  NOT NULL,
  weight_before_g NUMERIC(8,2)  NOT NULL,
  weight_after_g  NUMERIC(8,2)  NOT NULL,
  source          TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
  -- No updated_at — this is an immutable append-only ledger
);

CREATE INDEX idx_inventory_bean
  ON inventory_events (bean_id, created_at DESC);

CREATE INDEX idx_inventory_log
  ON inventory_events (log_id)
  WHERE log_id IS NOT NULL;
