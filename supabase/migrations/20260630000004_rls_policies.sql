-- Enable RLS on all tables
ALTER TABLE logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE beans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;

-- logs: users can only read/write their own rows
CREATE POLICY "Users access own rows only"
  ON logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- beans: users can only read/write their own rows
CREATE POLICY "Users access own rows only"
  ON beans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- inventory_events: users can only read/write their own rows
CREATE POLICY "Users access own rows only"
  ON inventory_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
