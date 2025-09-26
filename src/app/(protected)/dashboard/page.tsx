"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import ImageModal from "@/components/ImageModal";
import SearchBar, { SearchFilters } from "@/components/SearchBar";
import { filterImages } from "@/lib/search-utils";
import { useRouter, useSearchParams } from "next/navigation";

interface ImageRecord {
  id: string;
  filename: string;
  original_name: string;
  caption: string | null;
  storage_path: string;
  thumbnail_url: string | null;
  created_at: string;
  processing_status: "pending" | "processing" | "completed" | "failed";
  tags: string[] | null;
  description: string | null;
  dominant_colors: string[] | null;
  analyzed_at: string | null;
  ai_analysis_error?: string | null;
  signedUrl?: string | null;
  thumbnailSignedUrl?: string | null;
}

async function getUserImages(): Promise<ImageRecord[]> {
  const supabase = getSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: images, error } = await supabase
    .from("images")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching images:", error);
    return [];
  }

  // Generate signed URLs for each image (both original and thumbnail)
  const imagesWithUrls = await Promise.all(
    (images || []).map(async (img) => {
      // Get signed URL for original image
      const { data: originalData } = await supabase.storage
        .from("images")
        .createSignedUrl(img.storage_path, 3600); // 1 hour expiry

      // Get signed URL for thumbnail (if exists)
      let thumbnailSignedUrl = null;
      if (img.thumbnail_url) {
        const { data: thumbnailData } = await supabase.storage
          .from("images")
          .createSignedUrl(img.thumbnail_url, 3600);
        thumbnailSignedUrl = thumbnailData?.signedUrl || null;
      }

      return {
        ...img,
        signedUrl: originalData?.signedUrl || null,
        thumbnailSignedUrl,
      };
    })
  );

  return imagesWithUrls;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageRecord[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: "",
    searchType: "all",
    colorFilter: null,
    similarTo: null,
  });

  const successMessage = searchParams.get("success");

  // Load images on component mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        const fetchedImages = await getUserImages();
        setImages(fetchedImages);
        setFilteredImages(fetchedImages);
      } catch (error) {
        console.error("Failed to load images:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, []);

  // Apply search filters whenever filters or images change
  useEffect(() => {
    const filtered = filterImages(images, searchFilters);
    setFilteredImages(filtered);
  }, [images, searchFilters]);

  // Handle search filter changes
  const handleSearchChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  // Handle find similar images
  const handleFindSimilar = (imageId: string) => {
    setSearchFilters({
      query: "",
      searchType: "all",
      colorFilter: null,
      similarTo: imageId,
    });
  };

  // Handle color filter
  const handleColorFilter = (color: string) => {
    setSearchFilters({
      query: "",
      searchType: "all",
      colorFilter: color,
      similarTo: null,
    });
  };

  // Handle tag search
  const handleTagSearch = (tag: string) => {
    setSearchFilters({
      query: tag,
      searchType: "tags",
      colorFilter: null,
      similarTo: null,
    });
  };

  // Handle image click to open modal
  const handleImageClick = (image: ImageRecord) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  // Handle re-analyze image
  const handleReanalyze = async (imageId: string) => {
    setIsReanalyzing(true);

    try {
      const response = await fetch("/api/reanalyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to re-analyze image");
      }

      // Refresh images to show updated status
      const updatedImages = await getUserImages();
      setImages(updatedImages);

      // Update selected image if it's the one being re-analyzed
      if (selectedImage?.id === imageId) {
        const updatedImage = updatedImages.find((img) => img.id === imageId);
        if (updatedImage) {
          setSelectedImage(updatedImage);
        }
      }

      console.log("Re-analysis started successfully");
    } catch (error) {
      console.error("Failed to re-analyze image:", error);
      alert(
        `Failed to re-analyze image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-foreground/60">Loading images...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Your gallery</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="rounded-lg bg-foreground text-background px-4 py-2 font-medium hover:opacity-90 transition"
          >
            Upload image
          </Link>
        </div>
      </header>

      {successMessage && (
        <div className="mb-6 rounded-md border border-green-500/40 bg-green-500/10 text-sm px-3 py-2">
          {successMessage}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          onSearchChange={handleSearchChange}
          totalImages={images.length}
          filteredCount={filteredImages.length}
          activeFilters={searchFilters}
        />
      </div>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition cursor-pointer"
              onClick={() => handleImageClick(img)}
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background/60">
                {img.thumbnailSignedUrl || img.signedUrl ? (
                  <Image
                    src={img.thumbnailSignedUrl || img.signedUrl || ""}
                    alt={img.caption || img.original_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                    className="object-cover hover:scale-105 transition-transform"
                    title="Click to view details"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-foreground/50">
                    Failed to load image
                  </div>
                )}

                {/* Thumbnail indicator */}
                {img.thumbnailSignedUrl && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Optimized
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="text-sm text-foreground/80 font-medium truncate">
                  {img.original_name}
                </div>

                {/* AI Analysis Status */}
                <div className="mt-2 space-y-1">
                  {img.processing_status === "pending" && (
                    <div className="text-xs text-yellow-400 flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      AI analysis pending
                    </div>
                  )}

                  {img.processing_status === "processing" && (
                    <div className="text-xs text-blue-400 flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      Analyzing with AI...
                    </div>
                  )}

                  {img.processing_status === "completed" && img.tags && (
                    <div className="space-y-1">
                      <div className="text-xs text-green-400 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        AI analysis complete
                      </div>

                      {/* Description */}
                      {img.description && (
                        <div className="text-xs text-foreground/70 line-clamp-2">
                          {img.description}
                        </div>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {img.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {img.tags.length > 3 && (
                          <span className="text-xs text-foreground/50">
                            +{img.tags.length - 3} more
                          </span>
                        )}
                      </div>

                      {/* Dominant Colors */}
                      {img.dominant_colors &&
                        img.dominant_colors.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {img.dominant_colors.map((color, colorIndex) => (
                              <div
                                key={colorIndex}
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: color }}
                                title={color}
                              ></div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {img.processing_status === "failed" && (
                    <div className="text-xs text-red-400 flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      AI analysis failed
                    </div>
                  )}
                </div>

                {img.caption && (
                  <div className="text-xs text-foreground/60 mt-2 line-clamp-2">
                    <strong>Caption:</strong> {img.caption}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {images.length === 0 ? (
          <div className="text-center text-foreground/70 py-16">
            No images yet.{" "}
            <Link href="/upload" className="underline">
              Upload one
            </Link>
            .
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center text-foreground/70 py-16">
            <div className="mb-4">No images match your search criteria.</div>
            <div className="text-sm text-foreground/50">
              Try adjusting your search terms or clearing filters.
            </div>
          </div>
        ) : null}
      </section>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={{
            id: selectedImage.id,
            original_name: selectedImage.original_name,
            caption: selectedImage.caption || undefined,
            created_at: selectedImage.created_at,
            processing_status: selectedImage.processing_status,
            tags: selectedImage.tags || undefined,
            description: selectedImage.description || undefined,
            dominant_colors: selectedImage.dominant_colors || undefined,
            analyzed_at: selectedImage.analyzed_at || undefined,
            ai_analysis_error: selectedImage.ai_analysis_error || undefined,
            signedUrl: selectedImage.signedUrl || "",
            thumbnailSignedUrl: selectedImage.thumbnailSignedUrl || undefined,
          }}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onReanalyze={handleReanalyze}
          isReanalyzing={isReanalyzing}
          onFindSimilar={handleFindSimilar}
          onColorFilter={handleColorFilter}
          onTagSearch={handleTagSearch}
        />
      )}
    </main>
  );
}
