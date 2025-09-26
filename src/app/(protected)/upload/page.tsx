"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, use } from "react";
import { useDropzone } from "react-dropzone";
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

  const startUpload = React.useCallback(async () => {
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
            `/dashboard?success=${encodeURIComponent(
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
  }, [uploadStatuses, isUploading, router]);

  const processFiles = React.useCallback(
    (files: FileList | null) => {
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
    },
    [startUpload]
  );

  // React Dropzone configuration
  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        // Create a FileList-like object
        const dt = new DataTransfer();
        acceptedFiles.forEach((file) => dt.items.add(file));
        processFiles(dt.files);
      }
    },
    [processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".bmp", ".svg"],
    },
    multiple: true,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Since we auto-upload, just trigger the upload if not already running
    if (!isUploading) {
      startUpload();
    }
  }

  return (
    <>
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
          {/* Drag and Drop Zone */}
          <div
            {...getRootProps()}
            className={`
             relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
             ${
               isDragActive
                 ? "border-blue-400 bg-blue-400/10 scale-[1.02]"
                 : "border-white/20 bg-white/5 hover:bg-white/10"
             }
           `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="space-y-2">
                <svg
                  className="w-12 h-12 mx-auto text-foreground/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <h3 className="text-lg font-medium">
                  {selectedFiles && selectedFiles.length > 0
                    ? `${selectedFiles.length} file${
                        selectedFiles.length > 1 ? "s" : ""
                      } selected`
                    : isDragActive
                    ? "Drop your images here"
                    : "Upload your images"}
                </h3>
                <p className="text-sm text-foreground/60">
                  {isDragActive
                    ? "Release to upload"
                    : "Drag and drop your images here, or click to browse"}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 font-medium hover:opacity-90 transition">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Choose Files
              </div>
            </div>
          </div>

          {uploadStatuses.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-foreground/60 mb-3">Image previews:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {uploadStatuses.map((fileStatus, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square rounded-lg overflow-hidden bg-background/60 border border-white/10">
                      <Image
                        src={fileStatus.preview}
                        alt={fileStatus.file.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 200px"
                        className="object-cover"
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
    </>
  );
}
