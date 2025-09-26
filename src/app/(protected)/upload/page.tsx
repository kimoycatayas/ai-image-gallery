"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, use } from "react";
import { useDropzone } from "react-dropzone";
// import { useRouter } from "next/navigation"; // Removed as not needed
import { useUploadStatus } from "@/hooks/useUploadStatus";

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
  // const router = useRouter(); // Removed as not needed after removing redirect
  const [, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const { startBackgroundUpload } = useUploadStatus();

  const startUpload = React.useCallback(
    async (statusesToUpload?: FileUploadStatus[]) => {
      const statuses = statusesToUpload || uploadStatuses;
      console.log("startUpload called", {
        uploadStatuses: uploadStatuses.length,
        statusesToUpload: statusesToUpload?.length,
        actualStatuses: statuses.length,
        isUploading,
      });
      if (!statuses.length || isUploading) return;

      setIsUploading(true);
      console.log("Starting upload process...");

      try {
        // Get caption from form if available
        const captionInput = document.querySelector(
          'input[name="caption"]'
        ) as HTMLInputElement;
        const caption = captionInput?.value || undefined;

        // Create FileList from selected files
        const dt = new DataTransfer();
        statuses.forEach((status) => dt.items.add(status.file));
        console.log("Created FileList with", dt.files.length, "files");

        // Start background upload
        console.log("Calling startBackgroundUpload...");
        await startBackgroundUpload(dt.files, caption);
        console.log("Background upload completed successfully");

        // Show success message (removed unused fileCount variable)

        // Clear the form for new uploads
        setSelectedFiles(null);
        setUploadStatuses([]);

        // Clear the caption input (reuse the existing captionInput variable)
        if (captionInput) {
          captionInput.value = "";
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert(
          `Upload failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        // Update all statuses to error
        setUploadStatuses((prev) =>
          prev.map((status) => ({
            ...status,
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          }))
        );
      } finally {
        setIsUploading(false);
      }
    },
    [isUploading, startBackgroundUpload, uploadStatuses]
  ); // Removed router from deps as it's not needed

  const processFiles = React.useCallback(
    (files: FileList | null) => {
      console.log("processFiles called with", files?.length, "files");
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
        console.log("Set upload statuses:", fileStatuses.length);

        // Auto-start upload after a brief delay to show previews
        console.log("Setting timeout to start upload in 500ms...");
        setTimeout(() => {
          console.log(
            "Timeout triggered, calling startUpload with statuses..."
          );
          startUpload(fileStatuses); // Pass the statuses directly to avoid stale closure
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

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      uploadStatuses.forEach((status) => {
        URL.revokeObjectURL(status.preview);
      });
    };
  }, [uploadStatuses]);

  const removeFile = (index: number) => {
    setUploadStatuses((prev) => {
      const newStatuses = [...prev];
      URL.revokeObjectURL(newStatuses[index].preview);
      newStatuses.splice(index, 1);
      return newStatuses;
    });
  };

  const getStatusIcon = (status: FileUploadStatus["status"]) => {
    switch (status) {
      case "pending":
        return (
          <div className="w-5 h-5 rounded-full border-2 border-foreground/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-foreground/30" />
          </div>
        );
      case "uploading":
        return (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
        );
      case "success":
        return (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
    }
  };

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

      {/* Display error messages */}
      {params.error && (
        <div className="mb-6 p-4 border border-red-500/40 bg-red-500/10 rounded-lg text-red-300">
          <p className="text-sm">{params.error}</p>
        </div>
      )}

      {/* Display success messages */}
      {params.success && (
        <div className="mb-6 p-4 border border-green-500/40 bg-green-500/10 rounded-lg text-green-300">
          <p className="text-sm">{params.success}</p>
        </div>
      )}

      <form className="space-y-6">
        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
            ${
              isDragActive
                ? "border-foreground bg-foreground/5"
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
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <h3 className="text-lg font-medium">Upload your images</h3>
              <p className="text-sm text-foreground/60">
                {isDragActive
                  ? "Drop your images here..."
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
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Choose Files
            </div>
          </div>
        </div>

        {/* Caption Input */}
        <div>
          <label htmlFor="caption" className="block text-sm mb-2">
            Caption (optional)
          </label>
          <input
            type="text"
            id="caption"
            name="caption"
            placeholder="Describe your images"
            className="w-full rounded-lg border border-white/15 bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/30"
          />
          <p className="text-xs text-foreground/60 mt-1">
            This caption will be applied to all uploaded images
          </p>
        </div>

        {/* File Previews */}
        {uploadStatuses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Selected Images</h3>
            <div className="grid gap-4">
              {uploadStatuses.map((fileStatus, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={fileStatus.preview}
                      alt={fileStatus.file.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fileStatus.file.name}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {fileStatus.error && (
                      <p className="text-xs text-red-400 mt-1">
                        {fileStatus.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(fileStatus.status)}
                    {fileStatus.status === "pending" && !isUploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatuses.length === 0 && (
          <div className="text-center text-foreground/60 py-8">
            Select images to start uploading automatically
          </div>
        )}

        {/* Upload Progress Info */}
        {isUploading && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600" />
              <span className="text-sm font-medium text-blue-300">
                Starting background upload...
              </span>
            </div>
            <p className="text-xs text-blue-200">
              Your images will continue uploading even if you navigate away from
              this page. You can monitor progress in the dashboard.
            </p>
          </div>
        )}
      </form>
    </main>
  );
}
