-- User profiles. One row per auth user, created by the user on first login
-- (the frontend gates every protected route until it exists), so existing
-- users get the same one-time setup prompt as new sign-ups.
CREATE TABLE profiles (
  user_id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Lowercase-only regex makes plain UNIQUE case-insensitive.
  username         TEXT        NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  display_name     TEXT        NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 60),
  bio              TEXT        CHECK (char_length(bio) <= 500),
  location         TEXT        CHECK (char_length(location) <= 100),
  avatar_url       TEXT        CHECK (avatar_url ~ '^https?://'),
  experience_level TEXT        CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  brew_methods     TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(brew_methods) <= 20),
  origins          TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(origins) <= 30),
  roast_levels     TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(roast_levels) <= 10),
  interests        TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(interests) <= 20),
  primary_brewer   TEXT        CHECK (char_length(primary_brewer) <= 200),
  grinder          TEXT        CHECK (char_length(grinder) <= 200),
  -- Rendered as <a href> on other users' screens: http(s) only, so a
  -- javascript: URL can't be stored. Space-joined, so each element is checked.
  social_links     TEXT[]      NOT NULL DEFAULT '{}' CHECK (
                     cardinality(social_links) <= 5
                     AND array_to_string(social_links, ' ') ~ '^(https?://[^ ]{1,300}( |$))*$'
                   ),
  is_public        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or public profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR is_public);

CREATE POLICY "Insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO authenticated;
-- No DELETE (row goes with the auth user); created_at/updated_at are system-set.
GRANT INSERT (
    user_id, username, display_name, bio, location, avatar_url, experience_level,
    brew_methods, origins, roast_levels, interests, primary_brewer, grinder,
    social_links, is_public
) ON public.profiles TO authenticated;
GRANT UPDATE (
    username, display_name, bio, location, avatar_url, experience_level,
    brew_methods, origins, roast_levels, interests, primary_brewer, grinder,
    social_links, is_public
) ON public.profiles TO authenticated;

-- ── Brew stats ─────────────────────────────────────────────────────────────
-- logs RLS hides other users' rows, so stats for a public profile need
-- SECURITY DEFINER. Returns NULL unless the profile is the caller's own or public.
CREATE OR REPLACE FUNCTION profile_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_brews',   count(*) FILTER (WHERE l.log_type = 'home'),
    'cafe_visits',   count(*) FILTER (WHERE l.log_type = 'cafe'),
    'brews_last_30', count(*) FILTER (WHERE l.log_type = 'home' AND l.created_at > now() - interval '30 days'),
    'top_method',    mode() WITHIN GROUP (ORDER BY l.brew_method) FILTER (WHERE l.log_type = 'home')
  )
  FROM logs l
  WHERE l.user_id = p_user_id AND l.deleted_at IS NULL
  HAVING EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = p_user_id AND (p.is_public OR p.user_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION profile_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION profile_stats(UUID) TO authenticated;

-- ── Avatars ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Users write only under avatars/<their uid>/. Reads go through the public URL;
-- the SELECT policy is only there because storage upsert requires it.
CREATE POLICY "Read own avatar"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
