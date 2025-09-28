"use client";

import Image, { ImageProps } from "next/image";
import { useState, useCallback } from "react";
import { validateSignedUrl } from "@/lib/storage-utils";

interface SafeImageProps extends Omit<ImageProps, "src" | "onError"> {
  src: string | null | undefined;
  fallbackSrc?: string;
  onError?: (error: string) => void;
}

export default function SafeImage({
  src,
  fallbackSrc,
  onError,
  alt,
  ...props
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src || null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleError = useCallback(
    (error: string) => {
      console.error(`Image load error: ${error}`, { src: currentSrc });
      setHasError(true);
      setErrorMessage(error);
      onError?.(error);

      // Try fallback if available
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        console.log("Attempting fallback image:", fallbackSrc);
        setCurrentSrc(fallbackSrc);
        setHasError(false);
        return;
      }
    },
    [currentSrc, fallbackSrc, onError]
  );

  const handleImageError = useCallback(() => {
    if (!currentSrc) {
      handleError("No image source provided");
      return;
    }

    // Validate signed URL structure
    if (!validateSignedUrl(currentSrc)) {
      handleError("Invalid signed URL - missing token parameter");
      return;
    }

    handleError("Failed to load image from valid signed URL");
  }, [currentSrc, handleError]);

  // If no valid source available, show placeholder
  if (!currentSrc || hasError) {
    return (
      <div
        className="bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400"
        style={{
          width: props.width || "100%",
          height: props.height || "200px",
          minHeight: "100px",
        }}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-50"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm">Image unavailable</p>
          {process.env.NODE_ENV === "development" && errorMessage && (
            <p className="text-xs mt-1 text-red-500 max-w-xs break-words">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={handleImageError}
    />
  );
}