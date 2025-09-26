import { redirect } from "next/navigation";
import {
  signInWithPassword,
  signUpWithPassword,
  signOut,
} from "../../app/actions/auth";

// Mock the dependencies
jest.mock("next/navigation");

// Create a mock auth object that we can control
const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

// Mock the supabase client
jest.mock("../../lib/supabase/server", () => ({
  getSupabaseServerClient: jest.fn(() => ({
    auth: mockAuth,
  })),
}));

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe("Auth Actions", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe("signInWithPassword", () => {
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

    it("should redirect to sign-in with error message when authentication fails", async () => {
      // Arrange
      const mockFormData = new FormData();
      mockFormData.append("email", "test@example.com");
      mockFormData.append("password", "wrongpassword");

      const mockError = { message: "Invalid login credentials" };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      // Act
      await signInWithPassword(mockFormData);

      // Assert
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "wrongpassword",
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-in?error=Invalid%20login%20credentials"
      );
    });

    it("should handle empty email and password fields", async () => {
      // Arrange
      const mockFormData = new FormData();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      await signInWithPassword(mockFormData);

      // Assert
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "",
        password: "",
      });
    });

    it("should trim whitespace from email", async () => {
      // Arrange
      const mockFormData = new FormData();
      mockFormData.append("email", "  test@example.com  ");
      mockFormData.append("password", "password123");

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "123" } },
        error: null,
      });

      // Act
      await signInWithPassword(mockFormData);

      // Assert
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should handle network errors gracefully", async () => {
      // Arrange
      const mockFormData = new FormData();
      mockFormData.append("email", "test@example.com");
      mockFormData.append("password", "password123");

      const networkError = { message: "Network request failed" };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: networkError,
      });

      // Act
      await signInWithPassword(mockFormData);

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-in?error=Network%20request%20failed"
      );
    });
  });

  describe("signUpWithPassword", () => {
    it("should successfully sign up with valid credentials", async () => {
      // Arrange
      const mockFormData = new FormData();
      mockFormData.append("email", "newuser@example.com");
      mockFormData.append("password", "newpassword123");

      mockAuth.signUp.mockResolvedValue({
        data: {
          user: { id: "456", email: "newuser@example.com" },
          session: { access_token: "token" },
        },
        error: null,
      });

      // Act
      await signUpWithPassword(mockFormData);

      // Assert
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "newpassword123",
        options: {},
      });
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("should redirect to sign-up with error message when registration fails", async () => {
      // Arrange
      const mockFormData = new FormData();
      mockFormData.append("email", "invalid-email");
      mockFormData.append("password", "weak");

      const mockError = { message: "Password should be at least 6 characters" };
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      // Act
      await signUpWithPassword(mockFormData);

      // Assert
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "invalid-email",
        password: "weak",
        options: {},
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-up?error=Password%20should%20be%20at%20least%206%20characters"
      );
    });

    it("should handle duplicate email registration", async () => {
      // Arrange
      const mockFormData = new FormData();
      mockFormData.append("email", "existing@example.com");
      mockFormData.append("password", "password123");

      const duplicateError = { message: "User already registered" };
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: duplicateError,
      });

      // Act
      await signUpWithPassword(mockFormData);

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-up?error=User%20already%20registered"
      );
    });

    it("should trim whitespace from email during signup", async () => {
      // Arrange
      const mockFormData = new FormData();
      mockFormData.append("email", "  newuser@example.com  ");
      mockFormData.append("password", "password123");

      mockAuth.signUp.mockResolvedValue({
        data: { user: { id: "456" } },
        error: null,
      });

      // Act
      await signUpWithPassword(mockFormData);

      // Assert
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "password123",
        options: {},
      });
    });

    it("should handle empty fields during signup", async () => {
      // Arrange
      const mockFormData = new FormData();

      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: "Email is required" },
      });

      // Act
      await signUpWithPassword(mockFormData);

      // Assert
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "",
        password: "",
        options: {},
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-up?error=Email%20is%20required"
      );
    });
  });

  describe("signOut", () => {
    it("should successfully sign out user", async () => {
      // Arrange
      mockAuth.signOut.mockResolvedValue({ error: null });

      // Act
      await signOut();

      // Assert
      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in even if signOut fails", async () => {
      // Arrange
      mockAuth.signOut.mockResolvedValue({
        error: { message: "Network error" },
      });

      // Act
      await signOut();

      // Assert
      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should handle signOut throwing an exception", async () => {
      // Arrange
      mockAuth.signOut.mockRejectedValue(new Error("Network failure"));

      // Act & Assert
      await expect(signOut()).rejects.toThrow("Network failure");
    });
  });
});
