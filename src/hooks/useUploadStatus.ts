import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Image compression utility
async function compressImage(file: File, maxSizeBytes: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions to reduce file size
      let { width, height } = img;
      const maxDimension = 1920; // Max width or height

      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      // Start with high quality and reduce until file size is acceptable
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            if (blob.size <= maxSizeBytes || quality <= 0.1) {
              // Success or minimum quality reached
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Try with lower quality
              quality -= 0.1;
              tryCompress();
            }
          },
          "image/jpeg",
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () =>
      reject(new Error("Failed to load image for compression"));
    img.src = URL.createObjectURL(file);
  });
}

export interface UploadJob {
  id: string;
  filename: string;
  original_name: string;
  processing_status:
    | "uploading"
    | "processing"
    | "pending"
    | "ai_processing"
    | "completed"
    | "failed";
  upload_progress: number;
  ai_analysis_error?: string | null;
  created_at: string;
  signedUrl?: string | null;
  thumbnailSignedUrl?: string | null;
  description?: string | null;
  tags?: string[] | null;
  dominant_colors?: string[] | null;
}

// API response interface for single upload
interface UploadResponse {
  success: boolean;
  message: string;
  imageId: string;
  filename: string;
  originalFileName: string;
}

// Error interface for failed uploads
interface UploadError {
  fileName: string;
  error: string;
}

export function useUploadStatus(onAllUploadsComplete?: () => void) {
  const [activeUploads, setActiveUploads] = useState<UploadJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevHadActiveUploads = useRef(false);

  const supabase = getSupabaseBrowserClient();

  // Fetch current active uploads
  const fetchActiveUploads = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get images that are still processing
      const { data: images, error } = await supabase
        .from("images")
        .select("*")
        .eq("user_id", user.id)
        .in("processing_status", [
          "uploading",
          "processing",
          "pending",
          "ai_processing",
        ])
        .order("created_at", { ascending: false });

      // Auto-fail uploads that have been stuck for more than 5 minutes
      if (images && images.length > 0) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const stuckImages = images.filter((img) => {
          const createdAt = new Date(img.created_at);
          return createdAt < fiveMinutesAgo;
        });

        if (stuckImages.length > 0) {
          console.log(
            `Auto-failing ${stuckImages.length} stuck uploads older than 5 minutes`
          );
          await supabase
            .from("images")
            .update({
              processing_status: "failed",
              ai_analysis_error: "Upload timed out after 5 minutes",
              upload_progress: 0,
            })
            .in(
              "id",
              stuckImages.map((img) => img.id)
            );
        }
      }

      if (error) {
        console.error("Error fetching active uploads:", error);
        return;
      }

      // Generate signed URLs for images that have been uploaded
      const imagesWithUrls = await Promise.all(
        (images || []).map(async (img) => {
          let signedUrl = null;
          let thumbnailSignedUrl = null;

          // Only get signed URLs if the file has been uploaded (progress >= 70)
          if (img.upload_progress && img.upload_progress >= 70) {
            try {
              // Get original image signed URL
              const { data: originalData, error: originalError } =
                await supabase.storage
                  .from("images")
                  .createSignedUrl(img.storage_path, 3600);

              if (!originalError && originalData?.signedUrl) {
                signedUrl = originalData.signedUrl;
              }

              // Only get thumbnail URL if we're in completed status (thumbnails should exist)
              if (img.thumbnail_url && img.processing_status === "completed") {
                const { data: thumbnailData, error: thumbnailError } =
                  await supabase.storage
                    .from("images")
                    .createSignedUrl(img.thumbnail_url, 3600);

                if (!thumbnailError && thumbnailData?.signedUrl) {
                  thumbnailSignedUrl = thumbnailData.signedUrl;
                } else {
                  console.warn(
                    `Thumbnail not found for ${img.id}, using original`
                  );
                  thumbnailSignedUrl = signedUrl; // Use original as fallback
                }
              }
            } catch (error) {
              console.log(
                "Error getting signed URLs for image:",
                img.id,
                error
              );
            }
          }

          return {
            ...img,
            signedUrl,
            thumbnailSignedUrl,
          };
        })
      );

      setActiveUploads(imagesWithUrls);
    } catch (error) {
      console.error("Failed to fetch active uploads:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Set up real-time subscription for upload status changes
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to changes in the images table for the current user
      subscription = supabase
        .channel("upload-status")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "images",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Upload status change:", payload);

            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              const updatedImage = payload.new as UploadJob;
              console.log(
                "Processing update for image:",
                updatedImage.id,
                "status:",
                updatedImage.processing_status
              );

              // Update the active uploads list
              setActiveUploads((prev) => {
                const existing = prev.find((img) => img.id === updatedImage.id);
                console.log("Existing upload found:", !!existing);

                if (existing) {
                  // Update existing upload
                  const newList = prev.map((img) =>
                    img.id === updatedImage.id
                      ? { ...img, ...updatedImage }
                      : img
                  );
                  console.log(
                    "Updated existing upload, new status:",
                    updatedImage.processing_status
                  );
                  return newList;
                } else if (
                  [
                    "uploading",
                    "processing",
                    "pending",
                    "ai_processing",
                  ].includes(updatedImage.processing_status)
                ) {
                  // Add new upload to the list
                  console.log("Adding new upload to list");
                  return [updatedImage, ...prev];
                }

                console.log("No changes made to upload list");
                return prev;
              });

              // Remove from active uploads if completed or failed (with longer delay)
              if (
                ["completed", "failed"].includes(updatedImage.processing_status)
              ) {
                console.log(
                  "Scheduling removal of completed upload:",
                  updatedImage.id
                );
                setTimeout(() => {
                  setActiveUploads((prev) => {
                    const filtered = prev.filter(
                      (img) => img.id !== updatedImage.id
                    );
                    console.log(
                      "Removing completed upload, remaining:",
                      filtered.length
                    );
                    return filtered;
                  });
                }, 5000); // Increased to 5 seconds to ensure UI gets final update
              }
            }
          }
        )
        .subscribe();

      // Initial fetch
      await fetchActiveUploads();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase, fetchActiveUploads]);

  // Start background upload for single file
  const startSingleUpload = useCallback(
    async (file: File, caption?: string) => {
      const maxIndividualSize = 4 * 1024 * 1024; // 4MB per file

      let processedFile = file;

      // If file is too large, compress it
      if (file.size > maxIndividualSize) {
        console.log(
          `Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
        );
        processedFile = await compressImage(file, maxIndividualSize);
        console.log(
          `Compressed to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`
        );
      }

      // Check if file is still too large after compression
      if (processedFile.size > maxIndividualSize) {
        throw new Error(
          `File "${file.name}" is too large even after compression. Please use a smaller image.`
        );
      }

      const formData = new FormData();
      formData.append("file", processedFile);
      if (caption) {
        formData.append("caption", caption);
      }

      console.log(`Making fetch request for ${file.name}...`);
      const response = await fetch("/api/upload-background", {
        method: "POST",
        body: formData,
      });

      // Handle 413 Content Too Large error specifically
      if (response.status === 413) {
        throw new Error(
          "File size too large. Please reduce image size and try again."
        );
      }

      let result;
      try {
        result = await response.json();
      } catch {
        if (response.status === 413) {
          throw new Error(
            "File size too large. Please reduce image size and try again."
          );
        }
        throw new Error(`Upload failed with status ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      return {
        ...result,
        originalFileName: file.name,
      };
    },
    []
  );

  // Start background upload for multiple files
  const startBackgroundUpload = useCallback(
    async (files: FileList, caption?: string) => {
      try {
        console.log("startBackgroundUpload called with", files.length, "files");

        const fileArray = Array.from(files);
        const results: UploadResponse[] = [];
        const errors: UploadError[] = [];

        // Process each file individually with async requests
        await Promise.allSettled(
          fileArray.map(async (file) => {
            try {
              const result = await startSingleUpload(file, caption);
              results.push(result);
              console.log(`Successfully started upload for ${file.name}`);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Upload failed";
              errors.push({ fileName: file.name, error: errorMessage });
              console.error(`Failed to start upload for ${file.name}:`, error);
            }
          })
        );

        // Refresh active uploads to show the new jobs
        await fetchActiveUploads();

        return {
          success: true,
          message: `Started ${results.length} upload(s)`,
          results,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error) {
        console.error("Failed to start background uploads:", error);
        throw error;
      }
    },
    [startSingleUpload, fetchActiveUploads]
  );
  // Get upload status summary
  const getUploadSummary = useCallback(() => {
    const total = activeUploads.length;
    const uploading = activeUploads.filter(
      (img) => img.processing_status === "uploading"
    ).length;
    const processing = activeUploads.filter(
      (img) => img.processing_status === "processing"
    ).length;
    const aiProcessing = activeUploads.filter(
      (img) => img.processing_status === "ai_processing"
    ).length;
    const pending = activeUploads.filter(
      (img) => img.processing_status === "pending"
    ).length;
    const failed = activeUploads.filter(
      (img) => img.processing_status === "failed"
    ).length;

    return {
      total,
      uploading,
      processing,
      aiProcessing,
      pending,
      failed,
      inProgress: uploading + processing + aiProcessing + pending,
    };
  }, [activeUploads]);

  // Force clear stuck uploads
  const clearStuckUploads = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Clearing stuck uploads...");

      // Mark all stuck uploads as failed in the database
      const { error: updateError } = await supabase
        .from("images")
        .update({
          processing_status: "failed",
          ai_analysis_error: "Upload cancelled by user",
          upload_progress: 0,
        })
        .eq("user_id", user.id)
        .in("processing_status", [
          "uploading",
          "processing",
          "pending",
          "ai_processing",
        ]);

      if (updateError) {
        console.error("Error updating stuck uploads:", updateError);
      } else {
        console.log("Successfully marked stuck uploads as failed");
      }

      // Clear all active uploads from the UI
      setActiveUploads([]);

      // Refresh the upload list
      await fetchActiveUploads();

      console.log("Stuck uploads cleared successfully");
    } catch (error) {
      console.error("Failed to clear stuck uploads:", error);
    }
  }, [supabase, fetchActiveUploads]);

  // Auto-clear stuck uploads on mount (disabled - let user manually clear)
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     clearStuckUploads();
  //   }, 3000); // Wait 3 seconds after mount for data to settle

  //   return () => clearTimeout(timer);
  // }, [clearStuckUploads]);

  // Poll upload progress every 1 second, but only when there are active uploads
  useEffect(() => {
    const hasActiveUploads = activeUploads.some((upload) =>
      ["uploading", "processing", "pending", "ai_processing"].includes(
        upload.processing_status
      )
    );

    let pollInterval: NodeJS.Timeout | null = null;

    if (hasActiveUploads) {
      // Start polling when there are active uploads
      pollInterval = setInterval(() => {
        fetchActiveUploads();
      }, 1000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [activeUploads, fetchActiveUploads]);

  // Detect when all uploads are complete and trigger callback
  useEffect(() => {
    const currentHasActiveUploads = activeUploads.some((upload) =>
      ["uploading", "processing", "pending", "ai_processing"].includes(
        upload.processing_status
      )
    );

    // If we previously had active uploads and now we don't, all uploads are complete
    if (
      prevHadActiveUploads.current &&
      !currentHasActiveUploads &&
      activeUploads.length === 0
    ) {
      console.log("All uploads completed, triggering gallery refresh");
      onAllUploadsComplete?.();
    }

    prevHadActiveUploads.current = currentHasActiveUploads;
  }, [activeUploads, onAllUploadsComplete]);

  return {
    activeUploads,
    isLoading,
    startBackgroundUpload,
    getUploadSummary,
    refreshUploads: fetchActiveUploads,
    clearStuckUploads,
  };
}
