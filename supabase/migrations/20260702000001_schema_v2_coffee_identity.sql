-- Schema v2: structured coffee identity, equipment cascade, ratio fields, sensory_profile

-- Coffee identity fields
ALTER TABLE logs ADD COLUMN brand          TEXT;
ALTER TABLE logs ADD COLUMN varietal       TEXT;

-- Equipment (replaces machine)
ALTER TABLE logs ADD COLUMN equipment      TEXT;

-- Ratio & yield fields (replaces yield_g + computed ratio)
ALTER TABLE logs ADD COLUMN coffee_water_ratio TEXT;
ALTER TABLE logs ADD COLUMN ideal_yield_g      NUMERIC(7,2);
ALTER TABLE logs ADD COLUMN actual_yield_g     NUMERIC(7,2);

-- Structured sensory profile (replaces flat body/mouthfeel/acidity/finish/flavour_tags)
ALTER TABLE logs ADD COLUMN sensory_profile JSONB;

-- Backfill: carry forward old yield into actual_yield_g
UPDATE logs SET actual_yield_g = yield_g WHERE yield_g IS NOT NULL;

-- Backfill: carry forward machine into equipment
UPDATE logs SET equipment = machine WHERE machine IS NOT NULL;

-- Backfill: build sensory_profile from flat fields for all existing rows
UPDATE logs
SET sensory_profile = jsonb_strip_nulls(jsonb_build_object(
  'aroma',      '[]'::jsonb,
  'flavour',    COALESCE(to_jsonb(flavour_tags), '[]'::jsonb),
  'acidity',    CASE WHEN acidity  IS NOT NULL THEN jsonb_build_array(acidity)  ELSE '[]'::jsonb END,
  'body',       acidity,
  'bitterness', NULL,
  'mouthfeel',  mouthfeel,
  'finish',     CASE WHEN finish   IS NOT NULL THEN jsonb_build_array(finish)   ELSE '[]'::jsonb END
))
WHERE body IS NOT NULL OR mouthfeel IS NOT NULL OR acidity IS NOT NULL
   OR finish IS NOT NULL OR flavour_tags IS NOT NULL;

-- Index for brand lookups (autocomplete)
CREATE INDEX idx_logs_brand
  ON logs (user_id, lower(brand))
  WHERE deleted_at IS NULL AND brand IS NOT NULL;

-- GIN index on sensory_profile for future filtering
CREATE INDEX idx_logs_sensory_profile
  ON logs USING GIN (sensory_profile)
  WHERE deleted_at IS NULL AND sensory_profile IS NOT NULL;

-- Note: old columns (machine, yield_g, ratio, body, mouthfeel, acidity, finish,
-- flavour_tags) are retained for now and will be dropped after frontend is fully
-- deployed and migrated.
