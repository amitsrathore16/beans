-- Schema v3: refine coffee identity fields

-- New identity fields
ALTER TABLE logs ADD COLUMN coffee_type    TEXT;   -- 'Single Origin' | 'Blend'
ALTER TABLE logs ADD COLUMN origin_country TEXT;
ALTER TABLE logs ADD COLUMN origin_region  TEXT;
ALTER TABLE logs ADD COLUMN species        TEXT;   -- '100% Arabica' | '100% Robusta' | 'Arabica-Robusta Blend' | 'Other'
ALTER TABLE logs ADD COLUMN roast_date     DATE;

-- Backfill: carry old origin text into origin_region
UPDATE logs SET origin_region = origin WHERE origin IS NOT NULL;

-- brand column added in v2 is superseded by roaster — mark deprecated via comment only;
-- drop after all clients have migrated.
COMMENT ON COLUMN logs.brand IS 'Deprecated in v3 — use roaster instead';

-- origin column is superseded by origin_country + origin_region
COMMENT ON COLUMN logs.origin IS 'Deprecated in v3 — use origin_country / origin_region instead';

-- Index for origin_country filtering
CREATE INDEX idx_logs_origin_country
  ON logs (user_id, origin_country)
  WHERE deleted_at IS NULL AND origin_country IS NOT NULL;
