import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

      if (error) {
        console.error("Error fetching active uploads:", error);
        return;
      }

      // Generate signed URLs for images that have been uploaded
      const imagesWithUrls = await Promise.all(
        (images || []).map(async (img) => {
          let signedUrl = null;
          let thumbnailSignedUrl = null;

          // Only get signed URLs if the file has been uploaded (progress > 0)
          if (img.upload_progress && img.upload_progress > 0) {
            try {
              const { data: originalData, error: originalError } =
                await supabase.storage
                  .from("images")
                  .createSignedUrl(img.storage_path, 3600);

              if (!originalError && originalData?.signedUrl) {
                signedUrl = originalData.signedUrl;
              }

              if (img.thumbnail_url) {
                const { data: thumbnailData, error: thumbnailError } =
                  await supabase.storage
                    .from("images")
                    .createSignedUrl(img.thumbnail_url, 3600);

                if (!thumbnailError && thumbnailData?.signedUrl) {
                  thumbnailSignedUrl = thumbnailData.signedUrl;
                }
              }
            } catch (urlError) {
              console.log(
                "Skipping signed URLs for image still uploading:",
                img.id
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

              // Remove from active uploads if completed or failed
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
                }, 2000); // Reduced to 2 seconds for faster feedback
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

  // Start background upload
  const startBackgroundUpload = useCallback(
    async (files: FileList, caption?: string) => {
      try {
        console.log("startBackgroundUpload called with", files.length, "files");
        const formData = new FormData();

        Array.from(files).forEach((file) => {
          console.log("Adding file to FormData:", file.name, file.size);
          formData.append("files", file);
        });

        if (caption) {
          formData.append("caption", caption);
          console.log("Added caption:", caption);
        }

        console.log("Making fetch request to /api/upload-background...");
        const response = await fetch("/api/upload-background", {
          method: "POST",
          body: formData,
        });

        console.log("Response status:", response.status);
        const result = await response.json();
        console.log("Response result:", result);

        if (!result.success) {
          throw new Error(result.error || "Upload failed");
        }

        // Refresh active uploads to show the new jobs
        await fetchActiveUploads();

        return result;
      } catch (error) {
        console.error("Failed to start background upload:", error);
        throw error;
      }
    },
    [fetchActiveUploads]
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

      // Get all images to check their actual status
      const { data: allImages } = await supabase
        .from("images")
        .select("id, processing_status")
        .eq("user_id", user.id);

      if (allImages) {
        // Remove any uploads from activeUploads that are actually completed/failed in the database
        setActiveUploads((prev) => {
          return prev.filter((upload) => {
            const dbImage = allImages.find((img) => img.id === upload.id);
            if (
              dbImage &&
              ["completed", "failed"].includes(dbImage.processing_status)
            ) {
              console.log(
                "Clearing stuck upload:",
                upload.id,
                "actual status:",
                dbImage.processing_status
              );
              return false; // Remove from active uploads
            }
            return true; // Keep in active uploads
          });
        });
      }
    } catch (error) {
      console.error("Failed to clear stuck uploads:", error);
    }
  }, [supabase]);

  // Auto-clear stuck uploads on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      clearStuckUploads();
    }, 3000); // Wait 3 seconds after mount for data to settle

    return () => clearTimeout(timer);
  }, [clearStuckUploads]);

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
