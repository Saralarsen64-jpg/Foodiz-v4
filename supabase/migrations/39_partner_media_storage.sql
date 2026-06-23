-- Public restaurant/product media with owner-scoped writes.

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'restaurant-media',
  'restaurant-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'profile-media',
  'profile-media',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "restaurant_media_public_read" ON storage.objects;
CREATE POLICY "restaurant_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-media');

DROP POLICY IF EXISTS "restaurant_media_partner_insert" ON storage.objects;
CREATE POLICY "restaurant_media_partner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.current_user_has_role('partner')
);

DROP POLICY IF EXISTS "restaurant_media_partner_update" ON storage.objects;
CREATE POLICY "restaurant_media_partner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'restaurant-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.current_user_has_role('partner')
)
WITH CHECK (
  bucket_id = 'restaurant-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.current_user_has_role('partner')
);

DROP POLICY IF EXISTS "restaurant_media_partner_delete" ON storage.objects;
CREATE POLICY "restaurant_media_partner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'restaurant-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.current_user_has_role('partner')
);

DROP POLICY IF EXISTS "profile_media_public_read" ON storage.objects;
CREATE POLICY "profile_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-media');

DROP POLICY IF EXISTS "profile_media_owner_insert" ON storage.objects;
CREATE POLICY "profile_media_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_media_owner_update" ON storage.objects;
CREATE POLICY "profile_media_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_media_owner_delete" ON storage.objects;
CREATE POLICY "profile_media_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
