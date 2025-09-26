# 🗄️ SQL Database Setup

This folder contains all the SQL scripts needed to set up your Supabase database for the AI Image Gallery project.

## 📋 Execution Order

**Important**: Execute these SQL files in the exact order listed below in your Supabase SQL Editor.

### **1. Initial Setup**

```sql
-- Execute first: Basic database schema
sql/supabase-setup.sql
```

Creates the initial `images` table with basic columns for storing image metadata.

### **2. Thumbnail Support**

```sql
-- Execute second: Add thumbnail functionality
sql/add-thumbnail-column.sql
```

Adds the `thumbnail_url` column to support optimized image thumbnails.

### **3. AI Analysis Fields**

```sql
-- Execute third: Add AI analysis capabilities
sql/add-ai-analysis-columns.sql
```

Adds all columns needed for AI analysis: `tags`, `description`, `dominant_colors`, `processing_status`, etc.

### **4. Storage Policies Fix**

```sql
-- Execute fourth: Fix storage access policies
sql/fix-storage-policies.sql
```

Updates Supabase storage policies to properly handle user-specific image access.

### **5. Error Tracking**

```sql
-- Execute fifth: Add error tracking
sql/update-ai-analysis-error-column.sql
```

Adds the `ai_analysis_error` column for better error tracking and debugging.

## 📁 File Descriptions

| File                                                                         | Purpose                 | When to Use                 |
| ---------------------------------------------------------------------------- | ----------------------- | --------------------------- |
| [`supabase-setup.sql`](supabase-setup.sql)                                   | Initial database schema | First-time setup            |
| [`add-thumbnail-column.sql`](add-thumbnail-column.sql)                       | Thumbnail support       | After basic setup           |
| [`add-ai-analysis-columns.sql`](add-ai-analysis-columns.sql)                 | AI analysis fields      | Before enabling AI features |
| [`fix-storage-policies.sql`](fix-storage-policies.sql)                       | Storage access fix      | If images won't load        |
| [`update-ai-analysis-error-column.sql`](update-ai-analysis-error-column.sql) | Error tracking          | For debugging AI issues     |

## 🚀 Quick Setup

1. **Open Supabase Dashboard**

   - Go to your project's SQL Editor

2. **Execute in order**

   ```sql
   -- Copy and paste each file's contents in order:
   -- 1. supabase-setup.sql
   -- 2. add-thumbnail-column.sql
   -- 3. add-ai-analysis-columns.sql
   -- 4. fix-storage-policies.sql
   -- 5. update-ai-analysis-error-column.sql
   ```

3. **Verify setup**
   - Check that the `images` table exists
   - Verify all columns are present
   - Test that storage policies work

## 🔍 Table Schema (Final)

After running all scripts, your `images` table will have these columns:

```sql
CREATE TABLE images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    caption TEXT,
    storage_path TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- AI Analysis columns
    processing_status TEXT DEFAULT 'pending' NOT NULL,
    tags TEXT[],
    description TEXT,
    dominant_colors JSONB,
    analyzed_at TIMESTAMPTZ,
    ai_analysis_error TEXT
);
```

## 🔒 Security & RLS

The setup includes Row Level Security (RLS) policies that ensure:

- ✅ Users can only access their own images
- ✅ Proper storage bucket permissions
- ✅ Secure signed URL generation
- ✅ User-specific file paths

## 🛠️ Troubleshooting

### **Images won't load?**

- Make sure you ran `fix-storage-policies.sql`
- Check that your storage bucket is properly configured

### **AI analysis not working?**

- Verify all AI columns exist: `processing_status`, `tags`, `description`, etc.
- Make sure you ran `add-ai-analysis-columns.sql`

### **Upload errors?**

- Check RLS policies are correctly applied
- Ensure user authentication is working

### **Missing columns?**

- Review which SQL files you've executed
- Run any missing scripts in the correct order

## 📊 Database Indexes

The setup includes optimized indexes for:

- **Tags search**: GIN index on `tags` column
- **User queries**: Index on `user_id` and `created_at`
- **Processing status**: Index for filtering by `processing_status`

## 🔄 Migrations

If you need to update an existing database:

1. **Check current schema** against the final schema above
2. **Run only missing scripts** - each script uses `IF NOT EXISTS` where possible
3. **Test thoroughly** after each migration
4. **Backup first** if you have important data

## 💡 Tips

- **Always backup** before running SQL scripts on production
- **Test on development** environment first
- **Check Supabase logs** if something goes wrong
- **Use the SQL Editor** in Supabase Dashboard for best results

---

**Ready to set up your database? Start with `supabase-setup.sql`! 🚀**
