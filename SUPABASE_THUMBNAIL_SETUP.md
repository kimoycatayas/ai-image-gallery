# Supabase Setup for Thumbnail Support

## 🎯 Required Supabase Changes

### 1. Database Schema Update

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Add thumbnail_url column to store thumbnail file paths
ALTER TABLE images ADD COLUMN thumbnail_url TEXT;

-- Create an index for better performance when querying thumbnails
CREATE INDEX idx_images_thumbnail_url ON images(thumbnail_url) WHERE thumbnail_url IS NOT NULL;
```

### 2. Storage Structure

Your storage bucket will now have this structure:

```
images/
├── {user_id}/
│   ├── {timestamp}-{random}.jpg     (original images)
│   ├── {timestamp}-{random}.png     (original images)
│   └── thumbnails/
│       ├── {timestamp}-{random}_thumb.jpg  (300x300 thumbnails)
│       └── {timestamp}-{random}_thumb.jpg  (300x300 thumbnails)
```

### 3. Storage Policies

Your existing storage policies should work fine, but make sure they cover the `thumbnails/` subfolder. The current policies allow access to any file in the user's folder, including subfolders.

If you need to verify, your policies should look like this:

```sql
-- Users can upload to their own folder (including thumbnails subfolder)
CREATE POLICY "Users can upload own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Users can view their own images (including thumbnails)
CREATE POLICY "Users can view own images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

## 🔧 How It Works

### Upload Process

1. **Original Upload**: Image uploaded to `{user_id}/{filename}.ext`
2. **Thumbnail Generation**: 300x300 JPEG thumbnail created using Sharp
3. **Thumbnail Upload**: Thumbnail uploaded to `{user_id}/thumbnails/{filename}_thumb.jpg`
4. **Database Record**: Both paths stored in database

### Display Process

1. **Grid View**: Shows thumbnails (faster loading, better performance)
2. **Full View**: Can show original images when needed
3. **Fallback**: If no thumbnail exists, shows original image

## 📊 Benefits

- **⚡ Faster Loading**: 300x300 thumbnails load much faster than full images
- **📱 Better Mobile**: Smaller images use less mobile data
- **🎯 Optimized Format**: Thumbnails always saved as JPEG for consistent quality/size
- **🔄 Fallback Support**: Works with both old images (no thumbnail) and new images (with thumbnail)

## 🚀 Next Steps

1. Run the SQL commands above in Supabase
2. Test uploading a new image
3. Check that both original and thumbnail are created in storage
4. Verify the dashboard shows thumbnail with "Optimized" badge
