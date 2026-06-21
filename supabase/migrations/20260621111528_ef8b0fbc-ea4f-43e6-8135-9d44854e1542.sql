
CREATE POLICY "users read own snap files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'snaps' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users upload own snap files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'snaps' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users delete own snap files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'snaps' AND (storage.foldername(name))[1] = auth.uid()::text);
