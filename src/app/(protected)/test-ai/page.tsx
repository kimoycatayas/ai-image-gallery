"use client";

import { useState } from "react";
import Link from "next/link";

export default function TestAIPage() {
  const [imageId, setImageId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const analyzeImage = async () => {
    if (!imageId || !imageUrl) {
      setError("Please provide both Image ID and Image URL");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId,
          imageUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (err) {
      setError(
        "Network error: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Test AI Analysis</h1>
        <Link
          href="/dashboard"
          className="text-sm underline hover:no-underline"
        >
          Back to Gallery
        </Link>
      </header>

      <div className="space-y-6">
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-medium mb-4">Manual AI Analysis Test</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Image ID</label>
              <input
                type="text"
                value={imageId}
                onChange={(e) => setImageId(e.target.value)}
                placeholder="Enter image ID from database"
                className="w-full rounded-lg border border-white/15 bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/30"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter signed URL or public URL"
                className="w-full rounded-lg border border-white/15 bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/30"
              />
            </div>

            <button
              onClick={analyzeImage}
              disabled={isAnalyzing || !imageId || !imageUrl}
              className="rounded-lg bg-foreground text-background px-6 py-2.5 font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Image"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-4">
            <h3 className="text-red-400 font-medium mb-2">Error</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-500/10 border border-green-500/40 rounded-lg p-4">
            <h3 className="text-green-400 font-medium mb-4">Analysis Result</h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground/80 mb-2">
                  Description
                </h4>
                <p className="text-sm text-foreground/70">
                  {result.description}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground/80 mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground/80 mb-2">
                  Dominant Colors
                </h4>
                <div className="flex gap-2">
                  {result.dominantColors.map((color: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-white/20"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="text-xs text-foreground/70">
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-medium mb-4">How to Use</h2>
          <div className="space-y-2 text-sm text-foreground/70">
            <p>1. Go to your Supabase dashboard and find an image record</p>
            <p>2. Copy the image ID from the database</p>
            <p>3. Generate a signed URL for the image using Supabase Storage</p>
            <p>4. Paste both values above and click "Analyze Image"</p>
            <p>
              5. The AI will analyze the image and return tags, description, and
              colors
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
