"use client";

import React from "react";
import Image from "next/image";
import { X, RefreshCw, Calendar, Tag, Palette, FileText } from "lucide-react";

interface ImageModalProps {
  image: {
    id: string;
    original_name: string;
    caption?: string;
    created_at: string;
    processing_status: "pending" | "processing" | "completed" | "failed";
    tags?: string[];
    description?: string;
    dominant_colors?: string[];
    analyzed_at?: string;
    ai_analysis_error?: string;
    signedUrl: string;
    thumbnailSignedUrl?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onReanalyze?: (imageId: string) => void;
  isReanalyzing?: boolean;
  onFindSimilar?: (imageId: string) => void;
  onColorFilter?: (color: string) => void;
  onTagSearch?: (tag: string) => void;
}

export default function ImageModal({
  image,
  isOpen,
  onClose,
  onReanalyze,
  isReanalyzing = false,
  onFindSimilar,
  onColorFilter,
  onTagSearch,
}: ImageModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusDisplay = () => {
    switch (image.processing_status) {
      case "pending":
        return {
          icon: "🟡",
          text: "AI analysis pending",
          color: "text-yellow-400",
        };
      case "processing":
        return {
          icon: "🔵",
          text: "Analyzing with AI...",
          color: "text-blue-400",
        };
      case "completed":
        return {
          icon: "🟢",
          text: "AI analysis complete",
          color: "text-green-400",
        };
      case "failed":
        return {
          icon: "🔴",
          text: "AI analysis failed",
          color: "text-red-400",
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const showReanalyzeButton =
    (image.processing_status === "failed" ||
      image.processing_status === "pending") &&
    onReanalyze;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background/95 backdrop-blur border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold truncate pr-4">
            {image.original_name}
          </h2>
          <div className="flex items-center gap-3">
            {showReanalyzeButton && (
              <button
                onClick={() => onReanalyze!(image.id)}
                disabled={isReanalyzing}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isReanalyzing ? "animate-spin" : ""}`}
                />
                {isReanalyzing ? "Re-analyzing..." : "Re-analyze"}
              </button>
            )}

            {/* Find Similar Button - only show for completed analysis */}
            {image.processing_status === "completed" && onFindSimilar && (
              <button
                onClick={() => {
                  onFindSimilar(image.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
              >
                <Palette className="w-4 h-4" />
                Find similar
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Image Section */}
          <div className="lg:w-2/3 bg-black/20 flex items-center justify-center p-6">
            <div className="relative w-full h-full max-h-[500px] lg:max-h-[600px]">
              <Image
                src={image.thumbnailSignedUrl || image.signedUrl}
                alt={image.caption || image.original_name}
                fill
                className="object-contain rounded-lg"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
              {image.thumbnailSignedUrl && (
                <div className="absolute top-2 left-2">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                    Optimized
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:w-1/3 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Upload Info */}
              <div>
                <h3 className="text-sm font-medium text-foreground/80 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upload Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-foreground/60">Uploaded:</span>
                    <span className="ml-2">{formatDate(image.created_at)}</span>
                  </div>
                  {image.caption && (
                    <div>
                      <span className="text-foreground/60">Caption:</span>
                      <p className="mt-1 text-foreground/80">{image.caption}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Analysis Status */}
              <div>
                <h3 className="text-sm font-medium text-foreground/80 mb-3">
                  AI Analysis Status
                </h3>
                <div
                  className={`text-sm ${statusDisplay.color} flex items-center gap-2 mb-2`}
                >
                  <span>{statusDisplay.icon}</span>
                  {statusDisplay.text}
                </div>

                {image.analyzed_at &&
                  image.processing_status === "completed" && (
                    <div className="text-xs text-foreground/60">
                      Analyzed: {formatDate(image.analyzed_at)}
                    </div>
                  )}

                {image.processing_status === "failed" &&
                  image.ai_analysis_error && (
                    <div className="text-xs text-red-400/80 mt-2 p-2 bg-red-500/10 rounded">
                      Error: {image.ai_analysis_error}
                    </div>
                  )}
              </div>

              {/* AI Analysis Results */}
              {image.processing_status === "completed" && (
                <>
                  {/* Description */}
                  {image.description && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground/80 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Description
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {image.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {image.tags && image.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground/80 mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Tags ({image.tags.length})
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {image.tags.map((tag, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              if (onTagSearch) {
                                onTagSearch(tag);
                                onClose();
                              }
                            }}
                            className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors cursor-pointer"
                            title={`Search for images with "${tag}" tag`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dominant Colors */}
                  {image.dominant_colors &&
                    image.dominant_colors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground/80 mb-3 flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Dominant Colors
                        </h3>
                        <div className="flex gap-2">
                          {image.dominant_colors.map((color, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                if (onColorFilter) {
                                  onColorFilter(color);
                                  onClose();
                                }
                              }}
                              className="text-center hover:scale-110 transition-transform cursor-pointer group"
                              title={`Find images with similar ${color} color`}
                            >
                              <div
                                className="w-8 h-8 rounded-full border border-white/20 mb-1 group-hover:border-white/40 transition-colors"
                                style={{ backgroundColor: color }}
                              ></div>
                              <div className="text-xs text-foreground/60 font-mono group-hover:text-foreground/80 transition-colors">
                                {color}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
