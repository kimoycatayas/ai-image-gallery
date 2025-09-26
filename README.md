# 🖼️ AI Image Gallery

A modern, AI-powered image gallery built with Next.js, Supabase, and OpenAI's GPT-4 Vision. Upload images, get AI-powered analysis, and search through your collection with advanced filters.

## ✨ Features

- 📤 **Multi-image upload** with drag & drop support
- 🤖 **AI analysis** using OpenAI GPT-4 Vision for tags, descriptions, and color extraction
- 🔍 **Advanced search** with text, color, and similarity filters
- 🖼️ **Image modal** with detailed view and re-analysis options
- 📱 **Responsive design** optimized for all devices
- 🔒 **Secure authentication** with Supabase Auth
- ⚡ **Optimized thumbnails** for fast loading
- 🎨 **Modern UI** with dark theme and smooth animations

## 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd ai-image-gallery
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run database setup**

   - Execute SQL files in `sql/` folder in your Supabase SQL Editor

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open in browser**
   - Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   └── lib/                 # Utility functions
├── docs/                    # Documentation files
├── sql/                     # Database schema and setup
└── public/                  # Static assets
```

## 📚 Documentation

All project documentation is organized in the `docs/` folder:

### **Setup & Configuration**

- [`ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md) - Environment variables setup
- [`AI_SETUP_NEXT_STEPS.md`](docs/AI_SETUP_NEXT_STEPS.md) - AI analysis setup guide
- [`SUPABASE_THUMBNAIL_SETUP.md`](docs/SUPABASE_THUMBNAIL_SETUP.md) - Thumbnail configuration

### **Features & Usage**

- [`SEARCH_FEATURES.md`](docs/SEARCH_FEATURES.md) - Complete search functionality guide
- [`MODAL_REANALYZE_FEATURES.md`](docs/MODAL_REANALYZE_FEATURES.md) - Image modal and re-analysis features
- [`AI_TESTING_GUIDE.md`](docs/AI_TESTING_GUIDE.md) - Testing AI analysis functionality

### **Technical Documentation**

- [`ARCHITECTURE_DECISION.md`](docs/ARCHITECTURE_DECISION.md) - Architecture choices and rationale
- [`AI_SERVICE_COMPARISON.md`](docs/AI_SERVICE_COMPARISON.md) - AI service comparison and selection
- [`MODEL_UPDATE_FIX.md`](docs/MODEL_UPDATE_FIX.md) - OpenAI model deprecation fix

### **Troubleshooting**

- [`DEBUG_AI_ISSUES.md`](docs/DEBUG_AI_ISSUES.md) - Common AI analysis issues and solutions

## 🗄️ Database Setup

Execute the SQL files in the `sql/` folder in order:

1. [`supabase-setup.sql`](sql/supabase-setup.sql) - Initial database schema
2. [`add-thumbnail-column.sql`](sql/add-thumbnail-column.sql) - Thumbnail support
3. [`add-ai-analysis-columns.sql`](sql/add-ai-analysis-columns.sql) - AI analysis fields
4. [`fix-storage-policies.sql`](sql/fix-storage-policies.sql) - Storage policies fix
5. [`update-ai-analysis-error-column.sql`](sql/update-ai-analysis-error-column.sql) - Error tracking

## 🔧 Environment Variables

Required environment variables (see [`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md) for details):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4 Vision API
- **Auth**: Supabase Auth
- **Image Processing**: Sharp (for thumbnails)
- **UI**: Lucide React (icons), React Dropzone

## 🎯 Key Features

### **🤖 AI-Powered Analysis**

- Automatic tag generation
- Descriptive text analysis
- Dominant color extraction
- Smart similarity matching

### **🔍 Advanced Search**

- Real-time text search
- Color-based filtering
- AI similarity search
- Tag and description filtering

### **📱 Modern Interface**

- Responsive design
- Drag & drop upload
- Image modal with details
- Professional gallery layout

### **⚡ Performance**

- Optimized thumbnails
- Client-side filtering
- Efficient image loading
- Background AI processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🚀 Deployment

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically

For detailed deployment instructions, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

---

**Built with ❤️ using Next.js, Supabase, and OpenAI**
