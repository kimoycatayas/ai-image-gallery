import { redirect } from "next/navigation";
import { uploadSingleImage, uploadImage } from "../../app/actions/upload";

// Mock the dependencies
jest.mock("next/navigation");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock image processing utilities
jest.mock("../../lib/image-processing", () => ({
  generateThumbnail: jest.fn(),
  fileToBuffer: jest.fn(),
}));

// Mock AI analysis
jest.mock("../../lib/ai-analysis", () => ({
  analyzeImage: jest.fn(),
}));

// Create mock objects
const mockAuth = {
  getUser: jest.fn(),
};

const mockStorage = {
  from: jest.fn(() => ({
    upload: jest.fn(),
    remove: jest.fn(),
  })),
};

const mockDatabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

// Mock Supabase client
jest.mock("../../lib/supabase/server", () => ({
  getSupabaseServerClient: jest.fn(() => ({
    auth: mockAuth,
    storage: mockStorage,
    from: mockDatabase.from,
  })),
}));

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockGenerateThumbnail = require("../../lib/image-processing")
  .generateThumbnail as jest.MockedFunction<
  typeof import("../../lib/image-processing").generateThumbnail
>;
const mockFileToBuffer = require("../../lib/image-processing")
  .fileToBuffer as jest.MockedFunction<
  typeof import("../../lib/image-processing").fileToBuffer
>;
const mockAnalyzeImage = require("../../lib/ai-analysis")
  .analyzeImage as jest.MockedFunction<
  typeof import("../../lib/ai-analysis").analyzeImage
>;

describe("Upload Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock File
  const createMockFile = (
    name: string,
    type: string,
    size: number = 1024
  ): File => {
    const file = new File(["mock content"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  describe("uploadSingleImage", () => {
    it("should successfully upload a single image with thumbnail", async () => {
      // Arrange
      const mockFile = createMockFile("test.jpg", "image/jpeg", 1024);
      const mockUser = { id: "user123" };
      const mockThumbnailBuffer = Buffer.from("thumbnail");
      const mockFileBuffer = Buffer.from("file");

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFileToBuffer.mockResolvedValue(mockFileBuffer);
      mockGenerateThumbnail.mockResolvedValue(mockThumbnailBuffer);

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({ upload: mockUpload });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "img123", filename: "test.jpg" },
            error: null,
          }),
        }),
      });
      mockDatabase.from.mockReturnValue({ insert: mockInsert });

      mockAnalyzeImage.mockResolvedValue(undefined);

      // Act
      const result = await uploadSingleImage(mockFile, "Test caption");

      // Assert
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(mockFileToBuffer).toHaveBeenCalledWith(mockFile);
      expect(mockGenerateThumbnail).toHaveBeenCalledWith(mockFileBuffer);
      expect(mockUpload).toHaveBeenCalledTimes(2); // Original + thumbnail
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          original_name: "test.jpg",
          caption: "Test caption",
          processing_status: "pending",
        })
      );
      expect(result).toEqual({
        success: true,
        filename: "test.jpg",
        imageId: "img123",
      });
    });

    it("should reject non-image files", async () => {
      // Arrange
      const mockFile = createMockFile("document.pdf", "application/pdf");

      // Act & Assert
      await expect(uploadSingleImage(mockFile)).rejects.toThrow(
        'File "document.pdf" must be an image'
      );
    });

    it("should reject files larger than 50MB", async () => {
      // Arrange
      const largeSize = 51 * 1024 * 1024; // 51MB
      const mockFile = createMockFile("large.jpg", "image/jpeg", largeSize);

      // Act & Assert
      await expect(uploadSingleImage(mockFile)).rejects.toThrow(
        'File "large.jpg" size must be less than 50MB'
      );
    });

    it("should handle unauthenticated user", async () => {
      // Arrange
      const mockFile = createMockFile("test.jpg", "image/jpeg");
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      // Act & Assert
      await expect(uploadSingleImage(mockFile)).rejects.toThrow(
        "User not authenticated"
      );
    });

    it("should clean up files on storage upload failure", async () => {
      // Arrange
      const mockFile = createMockFile("test.jpg", "image/jpeg");
      const mockUser = { id: "user123" };
      const mockThumbnailBuffer = Buffer.from("thumbnail");
      const mockFileBuffer = Buffer.from("file");

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFileToBuffer.mockResolvedValue(mockFileBuffer);
      mockGenerateThumbnail.mockResolvedValue(mockThumbnailBuffer);

      // Mock original upload success, thumbnail upload failure
      const mockUpload = jest
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({
          error: { message: "Thumbnail upload failed" },
        });

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      });

      // Act & Assert
      await expect(uploadSingleImage(mockFile)).rejects.toThrow(
        'Failed to upload thumbnail for "test.jpg": Thumbnail upload failed'
      );

      expect(mockRemove).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("user123")])
      );
    });

    it("should clean up files on database insert failure", async () => {
      // Arrange
      const mockFile = createMockFile("test.jpg", "image/jpeg");
      const mockUser = { id: "user123" };
      const mockThumbnailBuffer = Buffer.from("thumbnail");
      const mockFileBuffer = Buffer.from("file");

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFileToBuffer.mockResolvedValue(mockFileBuffer);
      mockGenerateThumbnail.mockResolvedValue(mockThumbnailBuffer);

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });
      mockDatabase.from.mockReturnValue({ insert: mockInsert });

      // Act & Assert
      await expect(uploadSingleImage(mockFile)).rejects.toThrow(
        'Failed to save "test.jpg" to database: Database error'
      );

      expect(mockRemove).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("user123"),
          expect.stringContaining("thumb"),
        ])
      );
    });
  });

  describe("uploadImage", () => {
    it("should successfully upload multiple images", async () => {
      // Arrange
      const mockFiles = [
        createMockFile("image1.jpg", "image/jpeg"),
        createMockFile("image2.png", "image/png"),
      ];
      const mockUser = { id: "user123" };

      const formData = new FormData();
      mockFiles.forEach((file) => formData.append("files", file));
      formData.append("caption", "Test caption");

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({
        upload: mockUpload,
        remove: jest.fn(),
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockDatabase.from.mockReturnValue({ insert: mockInsert });

      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("Process exit called");
      });

      // Act
      try {
        await uploadImage(formData);
      } catch {
        // Expected to throw due to mocked process.exit
      }

      // Assert
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(mockUpload).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenCalledTimes(2);

      mockExit.mockRestore();
    });

    it("should redirect when no files are provided", async () => {
      // Arrange
      const formData = new FormData();

      // Act
      await uploadImage(formData);

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith(
        "/upload?error=" + encodeURIComponent("No files selected")
      );
    });

    it("should redirect for invalid file types", async () => {
      // Arrange
      const mockFile = createMockFile("document.pdf", "application/pdf");
      const formData = new FormData();
      formData.append("files", mockFile);

      // Act
      await uploadImage(formData);

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith(
        "/upload?error=" +
          encodeURIComponent('File "document.pdf" must be an image')
      );
    });

    it("should redirect for oversized files", async () => {
      // Arrange
      const largeSize = 51 * 1024 * 1024; // 51MB
      const mockFile = createMockFile("large.jpg", "image/jpeg", largeSize);
      const formData = new FormData();
      formData.append("files", mockFile);

      // Act
      await uploadImage(formData);

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith(
        "/upload?error=" +
          encodeURIComponent('File "large.jpg" size must be less than 50MB')
      );
    });

    it("should redirect to sign-in for unauthenticated user", async () => {
      // Arrange
      const mockFile = createMockFile("test.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("files", mockFile);

      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      // Act
      await uploadImage(formData);

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should clean up uploaded files on storage failure", async () => {
      // Arrange
      const mockFiles = [
        createMockFile("image1.jpg", "image/jpeg"),
        createMockFile("image2.jpg", "image/jpeg"),
      ];
      const mockUser = { id: "user123" };

      const formData = new FormData();
      mockFiles.forEach((file) => formData.append("files", file));

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First upload succeeds, second fails
      const mockUpload = jest
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: "Storage full" } });

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      });

      // Act
      await uploadImage(formData);

      // Assert
      expect(mockRemove).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith(
        "/upload?error=" +
          encodeURIComponent('Failed to upload "image2.jpg": Storage full')
      );
    });

    it("should clean up uploaded files on database failure", async () => {
      // Arrange
      const mockFiles = [
        createMockFile("image1.jpg", "image/jpeg"),
        createMockFile("image2.jpg", "image/jpeg"),
      ];
      const mockUser = { id: "user123" };

      const formData = new FormData();
      mockFiles.forEach((file) => formData.append("files", file));

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      });

      // First database insert succeeds, second fails
      const mockInsert = jest
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: "Database error" } });
      mockDatabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      await uploadImage(formData);

      // Assert
      expect(mockRemove).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith(
        "/upload?error=" +
          encodeURIComponent(
            'Failed to save "image2.jpg" to database: Database error'
          )
      );
    });
  });
});
