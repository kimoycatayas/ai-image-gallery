"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, use } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useUploadStatus } from "@/hooks/useUploadStatus";

interface FileUploadStatus {
  file: File;
  preview: string;
  status:
    | "pending"
    | "uploading"
    | "processing"
    | "ai_analyzing"
    | "completed"
    | "error"
    | "removed";
  error?: string;
  uploadId?: string;
  progress?: number;
  aiAnalysis?: {
    description?: string | null;
    tags?: string[] | null;
  };
}

export default function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = use(searchParams);
  const router = useRouter();
  const [, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [showCompletionSnackbar, setShowCompletionSnackbar] = useState(false);

  // Handle upload completion callback
  const handleAllUploadsComplete = React.useCallback(() => {
    console.log("All uploads completed! Showing snackbar and redirecting...");
    setShowCompletionSnackbar(true);

    // Redirect to homepage after 3 seconds
    setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
  }, [router]);

  const { startBackgroundUpload, activeUploads } = useUploadStatus(
    handleAllUploadsComplete
  );

  // Update upload statuses based on active uploads
  React.useEffect(() => {
    if (activeUploads.length > 0) {
      setUploadStatuses((prev) =>
        prev.map((status) => {
          const activeUpload = activeUploads.find(
            (upload) => upload.original_name === status.file.name
          );

          if (activeUpload) {
            const mappedStatus =
              activeUpload.processing_status === "uploading"
                ? "uploading"
                : activeUpload.processing_status === "processing"
                ? "processing"
                : activeUpload.processing_status === "pending"
                ? "processing"
                : activeUpload.processing_status === "ai_processing"
                ? "ai_analyzing"
                : activeUpload.processing_status === "completed"
                ? "completed"
                : activeUpload.processing_status === "failed"
                ? "error"
                : status.status;

            return {
              ...status,
              uploadId: activeUpload.id,
              progress:
                mappedStatus === "completed"
                  ? 100
                  : activeUpload.upload_progress || 0,
              status: mappedStatus,
              error:
                activeUpload.processing_status === "failed"
                  ? activeUpload.ai_analysis_error || "Upload failed"
                  : undefined,
              aiAnalysis:
                activeUpload.processing_status === "completed"
                  ? {
                      description: activeUpload.description,
                      tags: activeUpload.tags,
                    }
                  : undefined,
            };
          }

          // If status is completed but no activeUpload found, ensure 100% progress
          if (status.status === "completed" && !status.progress) {
            return {
              ...status,
              progress: 100,
            };
          }

          return status;
        })
      );
    }
  }, [activeUploads]);

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
        const result = await startBackgroundUpload(dt.files, caption);
        console.log("Background upload completed successfully");

        // Handle upload results and errors
        if (
          result.errors &&
          Array.isArray(result.errors) &&
          result.errors.length > 0
        ) {
          // Mark failed files in the UI
          setUploadStatuses((prev) =>
            prev.map((status) => {
              const error = result.errors?.find(
                (e) => e.fileName === status.file.name
              );
              if (error) {
                return {
                  ...status,
                  status: "error" as const,
                  error: error.error,
                };
              }
              return status;
            })
          );

          const errorCount = result.errors.length;
          const successCount = result.results.length;
          const errorList =
            errorCount > 3
              ? `${result.errors
                  .slice(0, 3)
                  .map((e) => e.fileName)
                  .join(", ")} and ${errorCount - 3} more`
              : result.errors.map((e) => e.fileName).join(", ");

          if (successCount > 0) {
            alert(
              `⚠️ Upload partially successful!\n\n` +
                `✅ ${successCount} image(s) started uploading successfully\n` +
                `❌ ${errorCount} image(s) failed to start:\n${errorList}\n\n` +
                `Check the status of each image below.`
            );
          } else {
            alert(
              `❌ Upload failed!\n\n` +
                `All ${errorCount} image(s) failed to start uploading:\n${errorList}\n\n` +
                `Please check file sizes and try again.`
            );
          }
        } else {
          // All uploads started successfully
          console.log(
            `All ${result.results.length} uploads started successfully`
          );
        }

        // Don't clear statuses immediately - let user see the progress
        setSelectedFiles(null);
        // setUploadStatuses([]); // Keep statuses to show upload progress

        // Clear the caption input (reuse the existing captionInput variable)
        if (captionInput) {
          captionInput.value = "";
        }
      } catch (error) {
        console.error("Upload error:", error);

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
              <p className="text-xs text-foreground/40 mt-1">
                Maximum: 4MB per image (auto-compressed if larger)
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
        {uploadStatuses.length > 0 && !showCompletionSnackbar && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Selected Images</h3>
              <button
                type="button"
                onClick={() => setUploadStatuses([])}
                className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-foreground/80 hover:text-foreground transition-colors"
              >
                Clear All
              </button>
            </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {fileStatus.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {/* Status Icon */}
                        {fileStatus.status === "pending" && (
                          <div className="w-4 h-4 rounded-full bg-gray-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        )}
                        {fileStatus.status === "uploading" && (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
                        )}
                        {fileStatus.status === "processing" && (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-yellow-300 border-t-yellow-600"></div>
                        )}
                        {fileStatus.status === "ai_analyzing" && (
                          <div className="relative w-4 h-4">
                            <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></div>
                            <div className="relative inline-flex rounded-full w-4 h-4 bg-purple-500"></div>
                          </div>
                        )}
                        {fileStatus.status === "completed" && (
                          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
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
                        )}
                        {fileStatus.status === "error" && (
                          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
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
                        )}
                        {fileStatus.status === "removed" && (
                          <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Status Text */}
                        <span
                          className={`text-xs font-medium ${
                            fileStatus.status === "pending"
                              ? "text-gray-400"
                              : fileStatus.status === "uploading"
                              ? "text-blue-400"
                              : fileStatus.status === "processing"
                              ? "text-yellow-400"
                              : fileStatus.status === "ai_analyzing"
                              ? "text-purple-400"
                              : fileStatus.status === "completed"
                              ? "text-green-400"
                              : fileStatus.status === "error"
                              ? "text-red-400"
                              : fileStatus.status === "removed"
                              ? "text-orange-400"
                              : "text-gray-400"
                          }`}
                        >
                          {fileStatus.status === "pending"
                            ? "Ready"
                            : fileStatus.status === "uploading"
                            ? "Uploading..."
                            : fileStatus.status === "processing"
                            ? "Processing..."
                            : fileStatus.status === "ai_analyzing"
                            ? "AI Analyzing..."
                            : fileStatus.status === "completed"
                            ? "Complete"
                            : fileStatus.status === "error"
                            ? "Failed"
                            : fileStatus.status === "removed"
                            ? "Removed"
                            : "Unknown"}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(fileStatus.status === "uploading" ||
                      fileStatus.status === "processing" ||
                      fileStatus.status === "ai_analyzing") && (
                      <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            fileStatus.status === "uploading"
                              ? "bg-blue-500"
                              : fileStatus.status === "processing"
                              ? "bg-yellow-500"
                              : "bg-purple-500"
                          }`}
                          style={{ width: `${fileStatus.progress || 0}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-foreground/60">
                        {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {(fileStatus.progress ||
                        fileStatus.status === "completed") && (
                        <p className="text-xs text-foreground/60">
                          {fileStatus.status === "completed"
                            ? "100"
                            : fileStatus.progress || 0}
                          %
                        </p>
                      )}
                    </div>

                    {fileStatus.error && (
                      <p className="text-xs text-red-400 mt-1">
                        {fileStatus.error}
                      </p>
                    )}

                    {fileStatus.aiAnalysis &&
                      fileStatus.status === "completed" && (
                        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
                          <p className="text-green-400 font-medium">
                            AI Analysis Complete
                          </p>
                          {fileStatus.aiAnalysis.description && (
                            <p className="text-green-300 mt-1">
                              {fileStatus.aiAnalysis.description}
                            </p>
                          )}
                          {fileStatus.aiAnalysis.tags &&
                            fileStatus.aiAnalysis.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {fileStatus.aiAnalysis.tags
                                  .slice(0, 3)
                                  .map((tag, i) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.5 bg-green-600/20 text-green-300 rounded text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                {fileStatus.aiAnalysis.tags.length > 3 && (
                                  <span className="text-green-400 text-xs">
                                    +{fileStatus.aiAnalysis.tags.length - 3}{" "}
                                    more
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                      )}
                  </div>
                  {/* Remove button */}
                  {fileStatus.status === "pending" && !isUploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Remove image"
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

      {/* Completion Snackbar */}
      {showCompletionSnackbar && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div
            className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg border border-green-500 cursor-pointer hover:bg-green-700 transition-colors"
            onClick={() => router.push("/dashboard")}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-200"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-100">
                  🎉 All uploads completed!
                </p>
                <p className="text-sm text-green-200 mt-1">
                  Your images have been successfully uploaded and analyzed.
                  Redirecting to gallery...
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCompletionSnackbar(false);
                }}
                className="flex-shrink-0 text-green-200 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
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
            </div>
            <div className="mt-3 bg-green-700 rounded-full h-1 overflow-hidden">
              <div
                className="bg-green-300 h-full transition-all duration-[3000ms] ease-linear"
                style={{ width: showCompletionSnackbar ? "100%" : "0%" }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
