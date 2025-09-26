import {
  generateThumbnail,
  getImageMetadata,
  fileToBuffer,
  ThumbnailOptions,
} from "../../lib/image-processing";

// Mock sharp
jest.mock("sharp", () => {
  const mockSharp = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn(),
    metadata: jest.fn(),
  };

  const sharpMock = jest.fn(() => mockSharp);
  return sharpMock;
});

import sharp from "sharp";

const mockSharp = sharp as jest.MockedFunction<typeof sharp>;
const mockSharpInstance = {
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  metadata: jest.fn(),
};

describe("Image Processing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharp.mockReturnValue(mockSharpInstance as any);
  });

  describe("generateThumbnail", () => {
    it("should generate thumbnail with default options", async () => {
      // Arrange
      const mockImageBuffer = Buffer.from("test image");
      const mockThumbnailBuffer = Buffer.from("thumbnail");
      mockSharpInstance.toBuffer.mockResolvedValue(mockThumbnailBuffer);

      // Act
      const result = await generateThumbnail(mockImageBuffer);

      // Assert
      expect(mockSharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(300, 300, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 80,
        progressive: true,
      });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
      expect(result).toBe(mockThumbnailBuffer);
    });

    it("should generate thumbnail with custom options", async () => {
      // Arrange
      const mockImageBuffer = Buffer.from("test image");
      const mockThumbnailBuffer = Buffer.from("thumbnail");
      const options: ThumbnailOptions = {
        width: 500,
        height: 400,
        quality: 90,
      };
      mockSharpInstance.toBuffer.mockResolvedValue(mockThumbnailBuffer);

      // Act
      const result = await generateThumbnail(mockImageBuffer, options);

      // Assert
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(500, 400, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 90,
        progressive: true,
      });
      expect(result).toBe(mockThumbnailBuffer);
    });

    it("should handle thumbnail generation errors", async () => {
      // Arrange
      const mockImageBuffer = Buffer.from("test image");
      const error = new Error("Sharp processing failed");
      mockSharpInstance.toBuffer.mockRejectedValue(error);

      // Act & Assert
      await expect(generateThumbnail(mockImageBuffer)).rejects.toThrow(
        "Failed to generate thumbnail"
      );
    });

    it("should use partial custom options with defaults", async () => {
      // Arrange
      const mockImageBuffer = Buffer.from("test image");
      const mockThumbnailBuffer = Buffer.from("thumbnail");
      const options: ThumbnailOptions = { width: 600 }; // Only width specified
      mockSharpInstance.toBuffer.mockResolvedValue(mockThumbnailBuffer);

      // Act
      await generateThumbnail(mockImageBuffer, options);

      // Assert
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(600, 300, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 80,
        progressive: true,
      });
    });
  });

  describe("getImageMetadata", () => {
    it("should return image metadata", async () => {
      // Arrange
      const mockImageBuffer = Buffer.from("test image");
      const mockMetadata = {
        width: 1920,
        height: 1080,
        format: "jpeg" as const,
        size: 1024,
        channels: 3,
      };
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata);

      // Act
      const result = await getImageMetadata(mockImageBuffer);

      // Assert
      expect(mockSharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.metadata).toHaveBeenCalled();
      expect(result).toEqual({
        width: 1920,
        height: 1080,
        format: "jpeg",
        size: 1024,
      });
    });

    it("should handle metadata extraction errors", async () => {
      // Arrange
      const mockImageBuffer = Buffer.from("test image");
      const error = new Error("Invalid image format");
      mockSharpInstance.metadata.mockRejectedValue(error);

      // Act & Assert
      await expect(getImageMetadata(mockImageBuffer)).rejects.toThrow(
        "Failed to get image metadata"
      );
    });

    it("should handle missing metadata fields gracefully", async () => {
      // Arrange
      const mockImageBuffer = Buffer.from("test image");
      const mockMetadata = {
        width: undefined,
        height: 1080,
        format: "png" as const,
        size: undefined,
      };
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata);

      // Act
      const result = await getImageMetadata(mockImageBuffer);

      // Assert
      expect(result).toEqual({
        width: undefined,
        height: 1080,
        format: "png",
        size: undefined,
      });
    });
  });

  describe("fileToBuffer", () => {
    it("should convert file to buffer", async () => {
      // Arrange
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockFile = {
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      } as unknown as File;

      // Act
      const result = await fileToBuffer(mockFile);

      // Assert
      expect(mockFile.arrayBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(8);
    });

    it("should handle file reading errors", async () => {
      // Arrange
      const error = new Error("File read failed");
      const mockFile = {
        arrayBuffer: jest.fn().mockRejectedValue(error),
      } as unknown as File;

      // Act & Assert
      await expect(fileToBuffer(mockFile)).rejects.toThrow("File read failed");
    });

    it("should correctly convert different file sizes", async () => {
      // Arrange
      const mockArrayBuffer = new ArrayBuffer(1024); // 1KB
      const mockFile = {
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      } as unknown as File;

      // Act
      const result = await fileToBuffer(mockFile);

      // Assert
      expect(result.length).toBe(1024);
    });

    it("should handle empty files", async () => {
      // Arrange
      const mockArrayBuffer = new ArrayBuffer(0);
      const mockFile = {
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      } as unknown as File;

      // Act
      const result = await fileToBuffer(mockFile);

      // Assert
      expect(result.length).toBe(0);
    });
  });
});
