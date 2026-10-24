-- Postgres regex bounds max out at 255, so the original `{1,300}` made the
-- check error on every profile insert/update ("invalid repetition count(s)").
-- Same rule, with the per-link length cap expressed outside the regex.
ALTER TABLE profiles DROP CONSTRAINT profiles_social_links_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_social_links_check CHECK (
  cardinality(social_links) <= 5
  AND array_to_string(social_links, ' ') ~ '^(https?://[^ ]+( |$))*$'
  AND char_length(array_to_string(social_links, ' ')) <= 1504   -- 5 × 300 + separators
);
