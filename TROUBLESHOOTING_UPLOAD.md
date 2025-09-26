# Upload Troubleshooting Guide

## Issue: Upload page shows files but nothing happens

Based on the screenshot, here are the steps to fix the background upload system:

### 🔧 **Step 1: Run Database Migration**

The background upload system requires a new `upload_progress` column. Run this SQL migration:

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres
```

```sql
-- Add support for background upload tracking
ALTER TABLE images
ADD COLUMN IF NOT EXISTS upload_progress INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_processing_status ON images(processing_status);
CREATE INDEX IF NOT EXISTS idx_images_user_created ON images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_user_status ON images(user_id, processing_status);

-- Add comments for documentation
COMMENT ON COLUMN images.upload_progress IS 'Upload and processing progress percentage (0-100)';
COMMENT ON COLUMN images.processing_status IS 'Status: uploading, processing, pending, ai_processing, completed, failed';
```

**Or via Supabase Dashboard:**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration script from `sql/add-background-upload-support.sql`
4. Run the migration

### 🔧 **Step 2: Environment Variables**

Make sure these environment variables are set:

```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your deployment URL
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 🔧 **Step 3: Test Upload API**

Test the background upload API endpoint:

```bash
# Open browser console and test
fetch('/api/upload-background', {
  method: 'POST',
  body: new FormData() // empty test
})
.then(r => r.json())
.then(console.log)
```

Expected response: `{"success": false, "error": "No files provided"}`

### 🔧 **Step 4: Check Browser Console**

1. Open browser dev tools (F12)
2. Go to upload page
3. Select files
4. Look for errors in Console tab

Common errors:

- `404` on `/api/upload-background` - API route not found
- `Column "upload_progress" doesn't exist` - Database migration not run
- `Network error` - Environment variables not set

### 🔧 **Step 5: Debug Real-time Subscriptions**

Check if Supabase subscriptions are working:

```javascript
// In browser console on dashboard:
const supabase = window.__SUPABASE_CLIENT__; // or import your client
supabase
  .channel("test")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "images",
    },
    console.log
  )
  .subscribe();
```

### 🔧 **Step 6: Verify Database Schema**

Check if your images table has the required columns:

```sql
-- In Supabase SQL editor:
\d images;

-- Should show:
-- - upload_progress (integer)
-- - processing_status (text)
-- Plus existing columns
```

### 🔧 **Step 7: Test Background Processing**

Manually test the flow:

1. Go to upload page
2. Select files
3. Check browser network tab for `/api/upload-background` request
4. Go to dashboard immediately
5. Look for "Upload Progress" section
6. Check database for new records with `processing_status = 'uploading'`

### 🛠️ **Quick Fix for Testing**

If you want to test the upload system immediately, add this debug version:

```typescript
// Temporary debug version in upload page
const debugUpload = async () => {
  console.log("Starting debug upload...");
  try {
    const response = await fetch("/api/upload-background", {
      method: "POST",
      body: new FormData(),
    });
    const result = await response.json();
    console.log("API Response:", result);
  } catch (error) {
    console.error("Upload error:", error);
  }
};

// Call this in browser console
window.debugUpload = debugUpload;
```

### 🚨 **Most Likely Issue**

Based on the symptoms, the most likely issue is:

**❌ Database migration not run** - The `upload_progress` column doesn't exist

**Solution**: Run the SQL migration script first, then test uploads.

---

## Success Indicators

✅ **Working correctly when:**

- Upload page shows "Starting background upload..." message
- Immediate redirect to dashboard with success toast
- Dashboard shows "Upload Progress" section
- Real-time progress updates appear
- Images appear in gallery when complete

❌ **Not working when:**

- No feedback after selecting files
- No redirect happens
- No "Upload Progress" section in dashboard
- Files appear selected but nothing happens (current issue)
