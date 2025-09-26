import React from "react";
import Image from "next/image";
import { UploadJob } from "@/hooks/useUploadStatus";

interface UploadProgressProps {
  uploads: UploadJob[];
  onRetry?: (imageId: string) => void;
  onClearStuck?: () => void;
}

const StatusIcon: React.FC<{ status: UploadJob["processing_status"] }> = ({
  status,
}) => {
  switch (status) {
    case "uploading":
    case "processing":
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600" />
      );
    case "pending":
      return (
        <div className="h-4 w-4 rounded-full bg-yellow-500 animate-pulse" />
      );
    case "ai_processing":
      return (
        <div className="relative h-4 w-4">
          <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></div>
          <div className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></div>
        </div>
      );
    case "completed":
      return (
        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
          <svg
            className="h-3 w-3 text-white"
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
    case "failed":
      return (
        <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
          <svg
            className="h-3 w-3 text-white"
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
    default:
      return null;
  }
};

const getStatusText = (status: UploadJob["processing_status"]): string => {
  switch (status) {
    case "uploading":
      return "Uploading...";
    case "processing":
      return "Processing...";
    case "pending":
      return "Waiting for AI analysis...";
    case "ai_processing":
      return "AI analyzing...";
    case "completed":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
};

const getStatusColor = (status: UploadJob["processing_status"]): string => {
  switch (status) {
    case "uploading":
    case "processing":
      return "text-blue-400";
    case "pending":
      return "text-yellow-400";
    case "ai_processing":
      return "text-purple-400";
    case "completed":
      return "text-green-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

export default function UploadProgress({
  uploads,
  onRetry,
  onClearStuck,
}: UploadProgressProps) {
  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Upload Progress</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground/60">
            {
              uploads.filter((u) =>
                [
                  "uploading",
                  "processing",
                  "pending",
                  "ai_processing",
                ].includes(u.processing_status)
              ).length
            }{" "}
            active
          </span>
          {onClearStuck && uploads.length > 0 && (
            <button
              onClick={onClearStuck}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-foreground/80 hover:text-foreground transition-colors"
              title="Clear stuck uploads that should have completed"
            >
              Clear Stuck
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="bg-white/5 border border-white/10 rounded-lg p-4 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              {/* Thumbnail or placeholder */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                {upload.thumbnailSignedUrl ? (
                  <Image
                    src={upload.thumbnailSignedUrl}
                    alt={upload.original_name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-foreground/40"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Upload info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p
                    className="text-sm font-medium truncate"
                    title={upload.original_name}
                  >
                    {upload.original_name}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusIcon status={upload.processing_status} />
                    <span
                      className={`text-xs font-medium ${getStatusColor(
                        upload.processing_status
                      )}`}
                    >
                      {getStatusText(upload.processing_status)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      upload.processing_status === "failed"
                        ? "bg-red-500"
                        : upload.processing_status === "completed"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${upload.upload_progress || 0}%` }}
                  />
                </div>

                {/* Status details */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground/60">
                    {upload.upload_progress || 0}%
                  </span>

                  {upload.processing_status === "failed" && (
                    <div className="flex items-center gap-2">
                      {upload.ai_analysis_error && (
                        <span
                          className="text-xs text-red-400"
                          title={upload.ai_analysis_error}
                        >
                          Error
                        </span>
                      )}
                      {onRetry && (
                        <button
                          onClick={() => onRetry(upload.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error details */}
            {upload.processing_status === "failed" &&
              upload.ai_analysis_error && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                  {upload.ai_analysis_error}
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
