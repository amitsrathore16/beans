CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to logs and beans only — inventory_events is immutable
CREATE TRIGGER set_logs_updated_at
  BEFORE UPDATE ON logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_beans_updated_at
  BEFORE UPDATE ON beans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
