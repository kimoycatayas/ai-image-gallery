# Testing Guide

This document provides an overview of the testing setup and practices for the AI Image Gallery application.

## Testing Framework

The project uses the following testing stack:

- **Jest** - JavaScript testing framework
- **React Testing Library** - Testing utilities for React components
- **@testing-library/jest-dom** - Custom Jest matchers for DOM elements
- **@testing-library/user-event** - User interaction simulation

## Setup

### Dependencies

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

### Configuration Files

- `jest.config.js` - Jest configuration with Next.js integration
- `jest.setup.js` - Global test setup and mocks
- `package.json` - Test scripts

### Test Scripts

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Test Structure

### Directory Structure

```
src/
├── __tests__/
│   ├── actions/
│   │   ├── auth.test.ts        # Auth action tests
│   │   └── upload.test.ts      # Upload action tests
│   ├── components/
│   │   ├── SignIn.test.tsx     # Sign-in page tests
│   │   ├── SignUp.test.tsx     # Sign-up page tests
│   │   └── Upload.test.tsx     # Upload page tests
│   ├── lib/
│   │   └── image-processing.test.ts # Image processing utility tests
│   └── utils/
│       └── test-utils.ts       # Test utilities and helpers
```

## Test Coverage

### Core Authentication Tests

#### Auth Actions (`src/__tests__/actions/auth.test.ts`)

Tests the server-side authentication actions:

**Sign In Tests:**

- ✅ Successful sign-in with valid credentials
- ✅ Error handling for invalid credentials
- ✅ Empty field validation
- ✅ Email whitespace trimming
- ✅ Network error handling

**Sign Up Tests:**

- ✅ Successful registration with valid data
- ✅ Registration failure error handling
- ✅ Duplicate email handling
- ✅ Email whitespace trimming
- ✅ Empty field validation

**Sign Out Tests:**

- ✅ Successful sign-out
- ✅ Error handling during sign-out
- ✅ Exception handling

#### Upload Action Tests (`src/__tests__/actions/upload.test.ts`)

Tests the server-side upload actions:

**uploadSingleImage Tests:**

- ✅ Successful upload with thumbnail generation
- ✅ File type validation (rejects non-images)
- ✅ File size validation (50MB limit)
- ✅ Authentication requirement
- ✅ Storage error handling and cleanup
- ✅ Database error handling and cleanup

**uploadImage Tests:**

- ✅ Multiple file upload handling
- ✅ Empty file list validation
- ✅ Invalid file type rejection
- ✅ Oversized file rejection
- ✅ Authentication requirement
- ✅ Error cleanup for partial failures

#### Image Processing Tests (`src/__tests__/lib/image-processing.test.ts`)

Tests the image processing utilities:

**generateThumbnail Tests:**

- ✅ Default thumbnail generation
- ✅ Custom options (width, height, quality)
- ✅ Error handling for processing failures
- ✅ Partial options with defaults

**getImageMetadata Tests:**

- ✅ Metadata extraction (width, height, format, size)
- ✅ Error handling for invalid images
- ✅ Missing metadata field handling

**fileToBuffer Tests:**

- ✅ File to buffer conversion
- ✅ Error handling for file read failures
- ✅ Different file sizes handling
- ✅ Empty file handling

#### Component Tests

**Sign-in Page (`src/__tests__/components/SignIn.test.tsx`)**

- ✅ Renders all required form elements
- ✅ Displays error messages from URL params
- ✅ Form field validation and attributes
- ✅ User input handling
- ✅ Navigation links
- ✅ Accessibility compliance
- ✅ Proper styling and layout

**Sign-up Page (`src/__tests__/components/SignUp.test.tsx`)**

- ✅ Renders all required form elements
- ✅ Error message display
- ✅ Form field validation
- ✅ User input handling
- ✅ Navigation links
- ✅ Different UI content from sign-in
- ✅ Accessibility compliance

**Upload Page (`src/__tests__/components/Upload.test.tsx`)**

- ✅ Renders upload interface elements
- ✅ Error and success message display
- ✅ File selection interface
- ✅ Drag and drop configuration
- ✅ Caption input handling
- ✅ Form validation and structure
- ✅ Accessibility compliance

## Testing Patterns

### Mocking Supabase

```typescript
// Mock the auth client
const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock("../../lib/supabase/server", () => ({
  getSupabaseServerClient: jest.fn(() => ({
    auth: mockAuth,
  })),
}));
```

### Testing Server Actions

```typescript
it("should successfully sign in with valid credentials", async () => {
  // Arrange
  const mockFormData = new FormData();
  mockFormData.append("email", "test@example.com");
  mockFormData.append("password", "password123");

  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: { id: "123", email: "test@example.com" } },
    error: null,
  });

  // Act
  await signInWithPassword(mockFormData);

  // Assert
  expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "password123",
  });
  expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
});
```

### Testing React Components

```typescript
it("should allow user to type in email and password fields", async () => {
  // Arrange
  const user = userEvent.setup();
  render(<SignInPage searchParams={mockSearchParams} />);

  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);

  // Act
  await user.type(emailInput, "test@example.com");
  await user.type(passwordInput, "password123");

  // Assert
  expect(emailInput).toHaveValue("test@example.com");
  expect(passwordInput).toHaveValue("password123");
});
```

## Test Utilities

### Helper Functions (`src/__tests__/utils/test-utils.ts`)

**Authentication Utilities:**

- `createMockFormData()` - Creates FormData for testing
- `createMockAuthResponse()` - Creates mock Supabase responses
- `testUsers` - Common test user data
- `commonErrors` - Common error messages

**File and Image Utilities:**

- `createMockFile()` - Creates mock File objects for testing
- `createMockImageFiles()` - Creates multiple mock image files
- `createMockFormDataWithFiles()` - Creates FormData with files
- `createMockStorageResponse()` - Creates mock Supabase storage responses
- `createMockDatabaseResponse()` - Creates mock database responses
- `mockImageTypes` - Common image MIME types
- `mockNonImageTypes` - Non-image file types for testing
- `fileSizes` - File size constants for testing
- `uploadErrors` - Common upload error messages

### Example Usage

**Authentication Testing:**

```typescript
import {
  createMockFormData,
  testUsers,
  commonErrors,
} from "../utils/test-utils";

const formData = createMockFormData({
  email: testUsers.validUser.email,
  password: testUsers.validUser.password,
});
```

**File Upload Testing:**

```typescript
import {
  createMockFile,
  createMockImageFiles,
  createMockFormDataWithFiles,
  mockImageTypes,
  fileSizes,
  uploadErrors,
} from "../utils/test-utils";

// Create a single mock image file
const imageFile = createMockFile(
  "test.jpg",
  mockImageTypes.jpeg,
  fileSizes.medium
);

// Create multiple mock files
const imageFiles = createMockImageFiles(3, "vacation");

// Create FormData with files and caption
const formData = createMockFormDataWithFiles(
  imageFiles,
  "Summer vacation photos"
);

// Test file size validation
const oversizedFile = createMockFile(
  "huge.jpg",
  mockImageTypes.jpeg,
  fileSizes.oversized
);
```

## Current Coverage

```
Test Suites: 6 passed, 6 total
Tests:       76 passed, 76 total

Auth Actions Coverage: 100%
- Sign in: 100% coverage
- Sign up: 100% coverage
- Sign out: 100% coverage

Upload Actions Coverage: 87.71%
- uploadSingleImage: ~90% coverage
- uploadImage: ~85% coverage
- File validation: 100% coverage
- Error handling: 100% coverage

Image Processing Coverage: 100%
- generateThumbnail: 100% coverage
- getImageMetadata: 100% coverage
- fileToBuffer: 100% coverage

Component Coverage:
- Sign-in page: 100% coverage
- Sign-up page: 100% coverage
- Upload page: 25.39% coverage (UI structure testing)
```

## Best Practices

1. **Test Behavior, Not Implementation** - Focus on what the user sees and does
2. **Use Descriptive Test Names** - Test names should describe the scenario and expected outcome
3. **Arrange-Act-Assert Pattern** - Structure tests clearly with setup, execution, and verification
4. **Mock External Dependencies** - Mock Supabase, Next.js navigation, etc.
5. **Test Error Cases** - Include both happy path and error scenarios
6. **Accessibility Testing** - Ensure forms are accessible with proper labels and roles

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch
```

## Future Test Additions

Consider adding tests for:

- Dashboard component and image gallery
- Search functionality and filtering
- Image modal component interactions
- AI analysis features and error handling
- Real file upload integration tests
- User workflow integration tests
- E2E tests with Playwright or Cypress
- Performance tests for large file uploads
- Accessibility tests with testing-library/jest-axe
