CREATE TABLE beans (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT          NOT NULL,
  roaster            TEXT,
  origin             TEXT,
  roast_level        TEXT,
  process_method     TEXT,
  roast_date         DATE,
  opened_date        DATE,
  total_weight_g     NUMERIC(8,2)  NOT NULL,
  remaining_weight_g NUMERIC(8,2)  NOT NULL,
  photo_url          TEXT,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_beans_user_name
  ON beans (user_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_beans_roast_date
  ON beans (user_id, roast_date DESC)
  WHERE deleted_at IS NULL;
