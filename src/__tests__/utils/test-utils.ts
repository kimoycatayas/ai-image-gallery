import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

// Mock FormData for testing
export function createMockFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

// Create mock Supabase auth response
export function createMockAuthResponse(
  success: boolean,
  user?: any,
  error?: { message: string }
) {
  if (success) {
    return {
      data: {
        user: user || { id: "123", email: "test@example.com" },
        session: { access_token: "mock-token" },
      },
      error: null,
    };
  } else {
    return {
      data: null,
      error: error || { message: "Authentication failed" },
    };
  }
}

// Custom render function that includes common providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { ...options });

export * from "@testing-library/react";
export { customRender as render };

// Common test data
export const testUsers = {
  validUser: {
    email: "test@example.com",
    password: "password123",
    id: "123",
  },
  invalidUser: {
    email: "invalid@example.com",
    password: "wrongpassword",
  },
  newUser: {
    email: "newuser@example.com",
    password: "newpassword123",
    id: "456",
  },
};

export const commonErrors = {
  invalidCredentials: "Invalid login credentials",
  userExists: "User already registered",
  weakPassword: "Password should be at least 6 characters",
  networkError: "Network request failed",
  invalidEmail: "Invalid email format",
};

// Helper to wait for async operations
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// File and Image Testing Utilities

/**
 * Create a mock File object for testing
 * @param name - File name
 * @param type - MIME type
 * @param size - File size in bytes
 * @param content - File content (optional)
 * @returns Mock File object
 */
export function createMockFile(
  name: string,
  type: string,
  size: number = 1024,
  content: string = "mock content"
): File {
  const file = new File([content], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

/**
 * Create multiple mock image files for testing
 * @param count - Number of files to create
 * @param prefix - File name prefix
 * @returns Array of mock File objects
 */
export function createMockImageFiles(
  count: number,
  prefix: string = "image"
): File[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFile(`${prefix}${i + 1}.jpg`, "image/jpeg", 1024 * (i + 1))
  );
}

/**
 * Create mock FormData with files for testing
 * @param files - Array of files to add
 * @param caption - Optional caption
 * @returns FormData object
 */
export function createMockFormDataWithFiles(
  files: File[],
  caption?: string
): FormData {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (caption) {
    formData.append("caption", caption);
  }
  return formData;
}

/**
 * Create mock Supabase storage response
 * @param success - Whether the operation was successful
 * @param error - Error message if unsuccessful
 * @returns Mock storage response
 */
export function createMockStorageResponse(success: boolean, error?: string) {
  if (success) {
    return { data: { path: "mock/path/file.jpg" }, error: null };
  } else {
    return { data: null, error: { message: error || "Storage error" } };
  }
}

/**
 * Create mock database response
 * @param success - Whether the operation was successful
 * @param data - Data to return if successful
 * @param error - Error message if unsuccessful
 * @returns Mock database response
 */
export function createMockDatabaseResponse(
  success: boolean,
  data?: any,
  error?: string
) {
  if (success) {
    return { data: data || { id: "mock-id" }, error: null };
  } else {
    return { data: null, error: { message: error || "Database error" } };
  }
}

/**
 * Mock image file types for testing
 */
export const mockImageTypes = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

/**
 * Mock non-image file types for testing
 */
export const mockNonImageTypes = {
  pdf: "application/pdf",
  doc: "application/msword",
  txt: "text/plain",
  zip: "application/zip",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
};

/**
 * File size constants for testing
 */
export const fileSizes = {
  small: 1024, // 1KB
  medium: 1024 * 1024, // 1MB
  large: 10 * 1024 * 1024, // 10MB
  oversized: 51 * 1024 * 1024, // 51MB (over limit)
};

/**
 * Common upload error messages
 */
export const uploadErrors = {
  invalidFileType: "File must be an image",
  fileTooLarge: "File size must be less than 50MB",
  noFilesSelected: "No files selected",
  uploadFailed: "Failed to upload file",
  storageError: "Storage upload failed",
  databaseError: "Failed to save to database",
  authenticationRequired: "User not authenticated",
  thumbnailGenerationFailed: "Failed to generate thumbnail",
};
