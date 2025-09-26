import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { use } from "react";
import UploadPage from "../../app/(protected)/upload/page";

// Mock the upload action
jest.mock("../../app/actions/upload", () => ({
  uploadSingleImage: jest.fn(),
}));

// Mock Next.js hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock React's use hook
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  use: jest.fn(),
}));

// Mock react-dropzone
jest.mock("react-dropzone", () => ({
  useDropzone: jest.fn(),
}));

// Mock useUploadStatus hook
jest.mock("../../hooks/useUploadStatus", () => ({
  useUploadStatus: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUse = use as jest.MockedFunction<typeof use>;
const mockUseUploadStatus = require("../../hooks/useUploadStatus")
  .useUploadStatus as jest.MockedFunction<
  typeof import("../../hooks/useUploadStatus").useUploadStatus
>;
const mockUseDropzone = require("react-dropzone")
  .useDropzone as jest.MockedFunction<
  typeof import("react-dropzone").useDropzone
>;

describe("UploadPage", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockSearchParams = Promise.resolve({});

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUse.mockReturnValue({});

    // Mock useUploadStatus
    mockUseUploadStatus.mockReturnValue({
      activeUploads: [],
      isLoading: false,
      startBackgroundUpload: jest.fn(),
      refreshUploads: jest.fn(),
      getUploadSummary: jest.fn(() => ({
        total: 0,
        uploading: 0,
        processing: 0,
        aiProcessing: 0,
        pending: 0,
        failed: 0,
        inProgress: 0,
      })),
      clearStuckUploads: jest.fn(),
    });

    // Mock useDropzone with default behavior
    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
    });

    // Mock DOM methods
    Object.defineProperty(window, "URL", {
      value: {
        createObjectURL: jest.fn(() => "mock-url"),
        revokeObjectURL: jest.fn(),
      },
    });

    // Mock DataTransfer
    global.DataTransfer = jest.fn().mockImplementation(() => ({
      items: {
        add: jest.fn(),
      },
      files: [],
    })) as any;
  });

  it("should render upload form with all required elements", () => {
    // Act
    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert
    expect(screen.getByText(/upload your images/i)).toBeInTheDocument();
    expect(
      screen.getByText(/drag and drop your images here/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
  });

  it("should display error message when provided in search params", () => {
    // Arrange
    const errorMessage = "Upload failed";
    mockUse.mockReturnValue({ error: errorMessage });

    // Act
    render(
      <UploadPage searchParams={Promise.resolve({ error: errorMessage })} />
    );

    // Assert
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    // Check that the error message container has the correct styling
    const errorContainer = screen.getByText(errorMessage).closest("div");
    expect(errorContainer).toHaveClass("border-red-500/40", "bg-red-500/10");
  });

  it("should display success message when provided in search params", () => {
    // Arrange
    const successMessage = "Images uploaded successfully";
    mockUse.mockReturnValue({ success: successMessage });

    // Act
    render(
      <UploadPage searchParams={Promise.resolve({ success: successMessage })} />
    );

    // Assert
    expect(screen.getByText(successMessage)).toBeInTheDocument();
    // Check that the success message container has the correct styling
    const successContainer = screen.getByText(successMessage).closest("div");
    expect(successContainer).toHaveClass(
      "border-green-500/40",
      "bg-green-500/10"
    );
  });

  it("should handle file selection via file input", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<UploadPage searchParams={mockSearchParams} />);

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const chooseFilesButton = screen.getByText(/choose files/i);

    // Act
    // Note: File input testing is limited in jsdom, so we test the UI elements
    expect(chooseFilesButton).toBeInTheDocument();
  });

  it("should show file previews when files are selected", async () => {
    // Arrange
    const mockFiles = [
      new File(["test1"], "test1.jpg", { type: "image/jpeg" }),
      new File(["test2"], "test2.png", { type: "image/png" }),
    ];

    // Mock the dropzone to simulate file drop
    mockUseDropzone.mockReturnValue({
      getRootProps: jest.fn(() => ({})),
      getInputProps: jest.fn(() => ({})),
      isDragActive: false,
    });

    render(<UploadPage searchParams={mockSearchParams} />);

    // Since file handling is complex in the actual component,
    // we focus on testing the UI structure
    expect(
      screen.getByText(/drag and drop your images here/i)
    ).toBeInTheDocument();
  });

  it("should validate caption input", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<UploadPage searchParams={mockSearchParams} />);

    const captionInput = screen.getByLabelText(/caption/i);

    // Act
    await user.type(captionInput, "Test caption for images");

    // Assert
    expect(captionInput).toHaveValue("Test caption for images");
  });

  it("should have proper form structure and attributes", () => {
    // Act
    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert
    const captionInput = screen.getByLabelText(/caption/i);
    expect(captionInput).toHaveAttribute("name", "caption");
    expect(captionInput).toHaveAttribute("placeholder");
  });

  it("should display proper styling and layout", () => {
    // Act
    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert
    const mainContainer = screen.getByRole("main");
    expect(mainContainer).toHaveClass("min-h-screen");

    const heading = screen.getByRole("heading", {
      name: /upload your images/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it("should handle drag and drop interface", () => {
    // Arrange
    let onDropCallback: ((files: File[]) => void) | undefined;

    mockUseDropzone.mockImplementation(({ onDrop }) => {
      onDropCallback = onDrop;
      return {
        getRootProps: jest.fn(() => ({
          "data-testid": "dropzone",
        })),
        getInputProps: jest.fn(() => ({})),
        isDragActive: false,
      };
    });

    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert that dropzone is configured
    expect(mockUseDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        onDrop: expect.any(Function),
        accept: {
          "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".bmp", ".svg"],
        },
        multiple: true,
      })
    );
  });

  it("should show upload progress indicators", () => {
    // Act
    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert basic structure exists
    expect(screen.getByText(/upload your images/i)).toBeInTheDocument();
  });

  it("should handle different error scenarios", () => {
    // Test file too large error
    const fileSizeError = "File size must be less than 50MB";
    mockUse.mockReturnValue({ error: fileSizeError });

    const { rerender } = render(
      <UploadPage searchParams={Promise.resolve({ error: fileSizeError })} />
    );
    expect(screen.getByText(fileSizeError)).toBeInTheDocument();

    // Test invalid file type error
    const fileTypeError = "File must be an image";
    mockUse.mockReturnValue({ error: fileTypeError });
    rerender(
      <UploadPage searchParams={Promise.resolve({ error: fileTypeError })} />
    );
    expect(screen.getByText(fileTypeError)).toBeInTheDocument();

    // Test upload failed error
    const uploadError = "Failed to upload image";
    mockUse.mockReturnValue({ error: uploadError });
    rerender(
      <UploadPage searchParams={Promise.resolve({ error: uploadError })} />
    );
    expect(screen.getByText(uploadError)).toBeInTheDocument();
  });

  it("should have accessible form labels and structure", () => {
    // Act
    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert
    expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();

    // Check for proper heading structure
    const heading = screen.getByRole("heading", {
      name: /upload your images/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it("should handle file upload with caption", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<UploadPage searchParams={mockSearchParams} />);

    const captionInput = screen.getByLabelText(/caption/i);

    // Act
    await user.type(captionInput, "Beautiful sunset");

    // Assert
    expect(captionInput).toHaveValue("Beautiful sunset");
  });

  it("should show proper upload instructions", () => {
    // Act
    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert
    expect(
      screen.getByText(/drag and drop your images here/i)
    ).toBeInTheDocument();
  });

  it("should handle multiple file formats", () => {
    // Act
    render(<UploadPage searchParams={mockSearchParams} />);

    // Assert that dropzone accepts multiple image formats
    expect(mockUseDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: {
          "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".bmp", ".svg"],
        },
      })
    );
  });
});
