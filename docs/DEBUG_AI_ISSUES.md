# 🔧 Debug AI Analysis Issues

## 🚨 **Current Issue: Images stuck on "AI analysis pending"**

I've identified and fixed the likely issue! The problem was that the `fetch()` call in server actions doesn't work as expected.

### ✅ **What I Fixed**

1. **Changed from async fetch to direct function call**
2. **Added proper error handling**
3. **Added detailed console logging**

## 🔍 **Debug Steps**

### **Step 1: Check Environment Variables**

Visit: `http://localhost:3000/api/debug`

This will show you:

```json
{
  "checks": {
    "openaiKey": true,
    "openaiKeyLength": 51,
    "supabaseUrl": true,
    "supabaseKey": true
  }
}
```

**Expected Results:**

- `openaiKey: true`
- `openaiKeyLength: 51` (or similar - should be around 50-60 characters)
- All other keys should be `true`

### **Step 2: Test Upload with Console Open**

1. **Open browser dev tools** (F12)
2. **Go to Console tab**
3. **Upload a new image**
4. **Watch for these console messages:**

```
✅ Expected console output:
Single upload started for: your-image.jpg
Generating thumbnail for: your-image.jpg
Single upload successful for: your-image.jpg
Starting AI analysis for: your-image.jpg
AI analysis completed for: your-image.jpg
```

```
❌ If you see errors like:
OpenAI Key loaded: false
Error in AI analysis: Missing API key
Failed to generate thumbnail: ...
```

### **Step 3: Check Database Schema**

Make sure you ran the SQL from `add-ai-analysis-columns.sql`:

```sql
-- Check if columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'images'
  AND column_name IN ('tags', 'description', 'processing_status', 'dominant_colors');
```

Should return 4 rows.

### **Step 4: Manual Test**

If automatic analysis still doesn't work, try manual analysis:

1. Go to `/test-ai`
2. Get an image ID from your database
3. Get a signed URL from Supabase Storage
4. Test the analysis manually

## 🔧 **Common Issues & Fixes**

### **Issue 1: OpenAI API Key Not Loaded**

```bash
# Check your .env.local file exists and has:
OPENAI_API_KEY=sk-your-key-here

# Restart your dev server:
npm run dev
```

### **Issue 2: Database Schema Missing**

```sql
-- Run this in Supabase SQL Editor:
ALTER TABLE images ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE images ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS dominant_colors JSONB;
ALTER TABLE images ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE images ADD COLUMN IF NOT EXISTS ai_analysis_error TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;
```

### **Issue 3: OpenAI API Errors**

Common OpenAI errors:

- **Invalid API key** - Check your key is correct
- **Rate limit exceeded** - Wait a few minutes
- **Insufficient credits** - Check your OpenAI account billing

### **Issue 4: Image URL Not Accessible**

The signed URL might be expired or invalid:

- Check that images are properly uploaded to Supabase Storage
- Verify storage policies allow access

## 🧪 **Quick Test Script**

Add this to your upload action temporarily for debugging:

```javascript
console.log("DEBUG - Environment check:", {
  hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  keyLength: process.env.OPENAI_API_KEY?.length,
  imageId: insertedImage.id,
  imageUrl: signedUrlData?.signedUrl ? "✅ Generated" : "❌ Missing",
});
```

## 📋 **Next Steps After Fix**

1. **✅ Try uploading a new image**
2. **✅ Check console for success messages**
3. **✅ Refresh dashboard to see AI results**
4. **✅ Verify all statuses show properly**

## 🎯 **Success Indicators**

You'll know it's working when:

- ✅ Console shows "AI analysis completed"
- ✅ Dashboard shows "🟢 AI analysis complete"
- ✅ Tags, description, and colors appear
- ✅ No error messages in console

## 🚀 **Try It Now**

The fix is now deployed! Try uploading a new image and watch the console. The analysis should complete much faster now since it runs directly in the server action instead of making an additional API call.
