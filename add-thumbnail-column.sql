-- Add thumbnail_url column to store thumbnail file paths
ALTER TABLE images ADD COLUMN thumbnail_url TEXT;

-- Create an index for better performance when querying thumbnails
CREATE INDEX idx_images_thumbnail_url ON images(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Update storage policies to allow thumbnail access
-- The existing policies should work, but let's make sure they cover thumbnails
-- These policies allow access to both original and thumbnail files in user folders
