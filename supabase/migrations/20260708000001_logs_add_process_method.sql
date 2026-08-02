-- The LogCreate model and the brew form both send `process_method`, but the logs
-- table never had this column (only `beans` did). Any log save that includes a
-- process method fails with PGRST204 "Could not find the 'process_method' column".
-- Add it to close the model↔schema gap.
ALTER TABLE logs ADD COLUMN process_method TEXT;
