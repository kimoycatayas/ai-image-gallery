"use client";

import Link from "next/link";
import { useState } from "react";

export default function UploadPage() {
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => setIsUploading(false), 1000);
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Upload image</h1>
        <Link
          href="/dashboard"
          className="text-sm underline hover:no-underline"
        >
          Back to gallery
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm mb-2">Choose an image</label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 cursor-pointer hover:bg-white/10 transition">
            <span className="truncate text-sm">
              {fileName || "No file chosen"}
            </span>
            <span className="rounded-md bg-foreground text-background px-3 py-1 text-sm">
              Browse
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm mb-2" htmlFor="caption">
            Caption (optional)
          </label>
          <input
            id="caption"
            name="caption"
            type="text"
            placeholder="Describe your image"
            className="w-full rounded-lg border border-white/15 bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/30"
          />
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="rounded-lg bg-foreground text-background px-6 py-2.5 font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </main>
  );
}
