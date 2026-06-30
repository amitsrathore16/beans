CREATE TABLE logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type         TEXT        NOT NULL,
  coffee_name      TEXT        NOT NULL,

  -- Shared sensory / identity fields
  roaster          TEXT,
  roast_level      TEXT,
  origin           TEXT,
  brew_method      TEXT,
  body             TEXT,
  mouthfeel        TEXT,
  acidity          TEXT,
  finish           TEXT,
  flavour_tags     TEXT[],
  rating           SMALLINT,
  notes            TEXT,

  -- Home-only extraction fields (NULL when log_type = 'cafe')
  machine          TEXT,
  grinder          TEXT,
  dose_g           NUMERIC(6,2),
  yield_g          NUMERIC(6,2),
  brew_time_s      INTEGER,
  grind_size       TEXT,
  water_temp_c     NUMERIC(5,2),
  ratio            NUMERIC(6,3) GENERATED ALWAYS AS (yield_g / NULLIF(dose_g, 0)) STORED,
  duplicated_from  UUID        REFERENCES logs(id),

  -- Café-only fields (NULL when log_type = 'home')
  cafe_name        TEXT,
  location         TEXT,
  would_return     TEXT,

  -- Timestamps
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discriminator and value constraints
ALTER TABLE logs ADD CONSTRAINT chk_log_type
  CHECK (log_type IN ('home', 'cafe'));

ALTER TABLE logs ADD CONSTRAINT chk_rating
  CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);

ALTER TABLE logs ADD CONSTRAINT chk_would_return
  CHECK (would_return IS NULL OR would_return IN ('Yes', 'Maybe', 'No'));

-- Indexes (TDD §4.7)
CREATE INDEX idx_logs_user_feed
  ON logs (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_logs_user_type_feed
  ON logs (user_id, log_type, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_logs_coffee_match
  ON logs (user_id, lower(coffee_name))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_logs_rating
  ON logs (user_id, rating DESC)
  WHERE deleted_at IS NULL AND rating IS NOT NULL;

CREATE INDEX idx_logs_cafe_name
  ON logs (user_id, lower(cafe_name))
  WHERE log_type = 'cafe' AND deleted_at IS NULL;

CREATE INDEX idx_logs_flavour_tags
  ON logs USING GIN (flavour_tags)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_logs_duplicated_from
  ON logs (duplicated_from)
  WHERE duplicated_from IS NOT NULL;
