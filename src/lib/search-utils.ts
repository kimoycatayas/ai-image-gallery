import type { SearchFilters } from "@/components/SearchBar";

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

/**
 * Filters images based on search criteria
 */
export function filterImages(
  images: ImageRecord[],
  filters: SearchFilters
): ImageRecord[] {
  let filtered = [...images];

  // Apply text search
  if (filters.query.trim()) {
    const query = filters.query.toLowerCase().trim();

    filtered = filtered.filter((image) => {
      switch (filters.searchType) {
        case "tags":
          return searchInTags(image, query);
        case "description":
          return searchInDescription(image, query);
        case "all":
        default:
          return (
            searchInTags(image, query) ||
            searchInDescription(image, query) ||
            searchInName(image, query) ||
            searchInCaption(image, query)
          );
      }
    });
  }

  // Apply color filter
  if (filters.colorFilter) {
    filtered = filtered.filter((image) =>
      filterByColor(image, filters.colorFilter!)
    );
  }

  // Apply similarity filter
  if (filters.similarTo) {
    const sourceImage = images.find((img) => img.id === filters.similarTo);
    if (sourceImage) {
      filtered = findSimilarImages(images, sourceImage, filters.similarTo);
    }
  }

  return filtered;
}

/**
 * Search in image tags
 */
function searchInTags(image: ImageRecord, query: string): boolean {
  if (!image.tags || image.tags.length === 0) return false;

  return image.tags.some((tag) => tag.toLowerCase().includes(query));
}

/**
 * Search in image description
 */
function searchInDescription(image: ImageRecord, query: string): boolean {
  if (!image.description) return false;

  return image.description.toLowerCase().includes(query);
}

/**
 * Search in image filename
 */
function searchInName(image: ImageRecord, query: string): boolean {
  return image.original_name.toLowerCase().includes(query);
}

/**
 * Search in image caption
 */
function searchInCaption(image: ImageRecord, query: string): boolean {
  if (!image.caption) return false;

  return image.caption.toLowerCase().includes(query);
}

/**
 * Filter images by dominant color
 */
function filterByColor(image: ImageRecord, targetColor: string): boolean {
  if (!image.dominant_colors || image.dominant_colors.length === 0) {
    return false;
  }

  // Check if any dominant color is similar to target color
  return image.dominant_colors.some((color) =>
    isColorSimilar(color, targetColor)
  );
}

/**
 * Check if two colors are similar
 */
function isColorSimilar(
  color1: string,
  color2: string,
  threshold: number = 30
): boolean {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return false;

  // Calculate color distance using Euclidean distance
  const distance = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );

  return distance <= threshold;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Find images similar to a source image based on tags and colors
 */
function findSimilarImages(
  allImages: ImageRecord[],
  sourceImage: ImageRecord,
  excludeId: string
): ImageRecord[] {
  if (sourceImage.processing_status !== "completed") {
    return [];
  }

  const similarImages = allImages
    .filter(
      (img) => img.id !== excludeId && img.processing_status === "completed"
    )
    .map((image) => ({
      image,
      similarity: calculateSimilarity(sourceImage, image),
    }))
    .filter(({ similarity }) => similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20) // Limit to top 20 similar images
    .map(({ image }) => image);

  return similarImages;
}

/**
 * Calculate similarity score between two images
 */
function calculateSimilarity(image1: ImageRecord, image2: ImageRecord): number {
  let score = 0;

  // Tag similarity (40% weight)
  if (image1.tags && image2.tags) {
    const tagSimilarity = calculateTagSimilarity(image1.tags, image2.tags);
    score += tagSimilarity * 0.4;
  }

  // Color similarity (35% weight)
  if (image1.dominant_colors && image2.dominant_colors) {
    const colorSimilarity = calculateColorSimilarity(
      image1.dominant_colors,
      image2.dominant_colors
    );
    score += colorSimilarity * 0.35;
  }

  // Description similarity (25% weight)
  if (image1.description && image2.description) {
    const descSimilarity = calculateDescriptionSimilarity(
      image1.description,
      image2.description
    );
    score += descSimilarity * 0.25;
  }

  return score;
}

/**
 * Calculate similarity between tag arrays
 */
function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 || tags2.length === 0) return 0;

  const set1 = new Set(tags1.map((tag) => tag.toLowerCase()));
  const set2 = new Set(tags2.map((tag) => tag.toLowerCase()));

  const intersection = new Set([...set1].filter((tag) => set2.has(tag)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Calculate similarity between color arrays
 */
function calculateColorSimilarity(
  colors1: string[],
  colors2: string[]
): number {
  if (colors1.length === 0 || colors2.length === 0) return 0;

  let maxSimilarity = 0;

  // Find the best color match between the two arrays
  for (const color1 of colors1) {
    for (const color2 of colors2) {
      if (isColorSimilar(color1, color2, 50)) {
        // More lenient threshold for similarity
        maxSimilarity = Math.max(maxSimilarity, 1);
      }
    }
  }

  return maxSimilarity;
}

/**
 * Calculate similarity between descriptions
 */
function calculateDescriptionSimilarity(desc1: string, desc2: string): number {
  const words1 = desc1.toLowerCase().split(/\s+/);
  const words2 = desc2.toLowerCase().split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((word) => set2.has(word)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Get search suggestions based on existing tags and descriptions
 */
export function getSearchSuggestions(images: ImageRecord[]): string[] {
  const suggestions = new Set<string>();

  images.forEach((image) => {
    // Add tags as suggestions
    if (image.tags) {
      image.tags.forEach((tag) => suggestions.add(tag));
    }

    // Add common words from descriptions
    if (image.description) {
      const words = image.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3); // Only words longer than 3 characters

      words.forEach((word) => suggestions.add(word));
    }
  });

  return Array.from(suggestions).sort().slice(0, 50); // Limit suggestions
}
