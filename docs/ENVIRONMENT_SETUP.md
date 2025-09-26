# Environment Setup Instructions

## 🔑 **Required Environment Variables**

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration (you already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (add this new one)
OPENAI_API_KEY=your_openai_api_key_here
```

## 📋 **Steps to Setup:**

1. **Create .env.local file** in your project root (same folder as package.json)
2. **Copy your existing Supabase variables** from your current setup
3. **Add your OpenAI API key** that you just purchased
4. **Restart your development server** after adding the environment variables

## 🔒 **Security Notes:**

- ✅ `.env.local` is already in `.gitignore` - your keys won't be committed
- ✅ `OPENAI_API_KEY` has no `NEXT_PUBLIC_` prefix - it's server-side only
- ✅ Only the server-side code can access the OpenAI API key

## 🧪 **Testing Environment:**

After setup, you can test that environment variables are loaded:

```javascript
// This should work in server-side code
console.log("OpenAI Key loaded:", !!process.env.OPENAI_API_KEY);
```

Make sure to restart your `npm run dev` server after adding the environment variables!
