import sharp from "sharp";

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Generate a thumbnail from an image buffer
 * @param imageBuffer - The original image buffer
 * @param options - Thumbnail generation options
 * @returns Promise<Buffer> - The thumbnail buffer
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const { width = 300, height = 300, quality = 80 } = options;

  try {
    const thumbnail = await sharp(imageBuffer)
      .resize(width, height, {
        fit: "cover", // Crop to fill the exact dimensions
        position: "center", // Crop from center
      })
      .jpeg({
        quality,
        progressive: true, // Better for web loading
      })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    throw new Error("Failed to generate thumbnail");
  }
}

/**
 * Get image metadata
 * @param imageBuffer - The image buffer
 * @returns Promise with image metadata
 */
export async function getImageMetadata(imageBuffer: Buffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
    };
  } catch (error) {
    console.error("Error getting image metadata:", error);
    throw new Error("Failed to get image metadata");
  }
}

/**
 * Convert file to buffer
 * @param file - The File object
 * @returns Promise<Buffer> - The file buffer
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
