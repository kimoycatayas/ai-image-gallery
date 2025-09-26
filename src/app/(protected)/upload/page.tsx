"use client";

import Link from "next/link";
import { useState, use } from "react";
import { uploadSingleImage } from "@/app/actions/upload";
import { useRouter } from "next/navigation";

interface FileUploadStatus {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = use(searchParams);
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    setSelectedFiles(files);

    // Create preview URLs and initial status for each file
    if (files) {
      const fileStatuses: FileUploadStatus[] = Array.from(files).map(
        (file) => ({
          file,
          preview: URL.createObjectURL(file),
          status: "pending" as const,
        })
      );
      setUploadStatuses(fileStatuses);

      // Auto-start upload after a brief delay to show previews
      setTimeout(() => {
        startUpload();
      }, 500);
    } else {
      setUploadStatuses([]);
    }
  }

  async function startUpload() {
    if (!uploadStatuses.length || isUploading) return;

    setIsUploading(true);

    try {
      // Get caption from form if available
      const captionInput = document.querySelector(
        'input[name="caption"]'
      ) as HTMLInputElement;
      const caption = captionInput?.value || undefined;

      let successCount = 0;

      // Upload each file individually
      for (let i = 0; i < uploadStatuses.length; i++) {
        const fileStatus = uploadStatuses[i];

        // Update status to uploading
        setUploadStatuses((prev) =>
          prev.map((status, index) =>
            index === i ? { ...status, status: "uploading" } : status
          )
        );

        try {
          await uploadSingleImage(fileStatus.file, caption);

          // Update status to success
          setUploadStatuses((prev) =>
            prev.map((status, index) =>
              index === i ? { ...status, status: "success" } : status
            )
          );

          successCount++;
        } catch (error) {
          // Update status to error
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";
          setUploadStatuses((prev) =>
            prev.map((status, index) =>
              index === i
                ? { ...status, status: "error", error: errorMessage }
                : status
            )
          );
        }
      }

      // Wait a moment to show success states, then redirect
      setTimeout(() => {
        if (successCount > 0) {
          router.push(
            `/?success=${encodeURIComponent(
              `${successCount} image${
                successCount > 1 ? "s" : ""
              } uploaded successfully!`
            )}`
          );
        }
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Since we auto-upload, just trigger the upload if not already running
    if (!isUploading) {
      startUpload();
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Upload images</h1>
        <Link
          href="/dashboard"
          className="text-sm underline hover:no-underline"
        >
          Back to gallery
        </Link>
      </header>

      {params?.error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 text-sm px-3 py-2">
          {params.error}
        </div>
      )}

      {params?.success && (
        <div className="mb-4 rounded-md border border-green-500/40 bg-green-500/10 text-sm px-3 py-2">
          {params.success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm mb-2">Choose images</label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 cursor-pointer hover:bg-white/10 transition">
            <span className="truncate text-sm">
              {selectedFiles && selectedFiles.length > 0
                ? `${selectedFiles.length} file${
                    selectedFiles.length > 1 ? "s" : ""
                  } selected`
                : "No files chosen"}
            </span>
            <span className="rounded-md bg-foreground text-background px-3 py-1 text-sm">
              Browse
            </span>
            <input
              type="file"
              name="files"
              accept="image/*"
              multiple
              required
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {uploadStatuses.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-foreground/60 mb-3">Image previews:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {uploadStatuses.map((fileStatus, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square rounded-lg overflow-hidden bg-background/60 border border-white/10">
                      <img
                        src={fileStatus.preview}
                        alt={fileStatus.file.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Upload Status Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {fileStatus.status === "uploading" && (
                          <div className="bg-black/70 rounded-full p-3">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}

                        {fileStatus.status === "success" && (
                          <div className="bg-green-500/90 rounded-full p-3">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}

                        {fileStatus.status === "error" && (
                          <div className="bg-red-500/90 rounded-full p-3">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="mt-1">
                      <div className="text-xs text-foreground/80 truncate">
                        {fileStatus.file.name}
                      </div>
                      <div className="text-xs text-foreground/60">
                        {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>

                      {/* Status Text */}
                      {fileStatus.status === "uploading" && (
                        <div className="text-xs text-blue-400 mt-1">
                          Uploading...
                        </div>
                      )}
                      {fileStatus.status === "success" && (
                        <div className="text-xs text-green-400 mt-1">
                          ✓ Uploaded!
                        </div>
                      )}
                      {fileStatus.status === "error" && (
                        <div
                          className="text-xs text-red-400 mt-1"
                          title={fileStatus.error}
                        >
                          ✗ Failed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm mb-2" htmlFor="caption">
            Caption (optional)
          </label>
          <input
            id="caption"
            name="caption"
            type="text"
            placeholder="Describe your images"
            className="w-full rounded-lg border border-white/15 bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/30"
          />
          <p className="text-xs text-foreground/60 mt-1">
            This caption will be applied to all uploaded images
          </p>
        </div>

        {uploadStatuses.length === 0 ? (
          <div className="text-center text-foreground/60 py-8">
            Select images to start uploading automatically
          </div>
        ) : (
          <button
            type="submit"
            disabled={isUploading}
            className="rounded-lg bg-foreground text-background px-6 py-2.5 font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading
              ? `Uploading ${uploadStatuses.length} image${
                  uploadStatuses.length === 1 ? "" : "s"
                }...`
              : uploadStatuses.every((s) => s.status === "success")
              ? "All images uploaded!"
              : uploadStatuses.some((s) => s.status === "error")
              ? "Retry failed uploads"
              : "Start upload"}
          </button>
        )}
      </form>
    </main>
  );
}
