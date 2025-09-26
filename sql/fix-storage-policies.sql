-- First, let's check if the bucket exists and is properly configured
-- Run this in Supabase SQL Editor to check bucket status
SELECT * FROM storage.buckets WHERE id = 'images';

-- If the bucket doesn't exist, create it with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', false, 52428800, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*'];

-- Drop existing storage policies to recreate them
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Create updated storage policies with proper folder structure
CREATE POLICY "Users can upload own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'images' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can view own images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'images' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'images' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Also create a policy for updating (in case we need it later)
CREATE POLICY "Users can update own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'images' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Test the policies by checking what they should match
-- This should return your user ID if everything is working
SELECT auth.uid() as current_user_id;

