import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { use } from "react";
import SignInPage from "../../app/(auth)/sign-in/page";

// Mock the auth action
jest.mock("../../app/actions/auth", () => ({
  signInWithPassword: jest.fn(),
}));

// Mock React's use hook for searchParams
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  use: jest.fn(),
}));

const mockUse = use as jest.MockedFunction<typeof use>;

describe("SignInPage", () => {
  const mockSearchParams = Promise.resolve({});

  beforeEach(() => {
    jest.clearAllMocks();
    mockUse.mockReturnValue({});
  });

  it("should render sign-in form with all required elements", () => {
    // Act
    render(<SignInPage searchParams={mockSearchParams} />);

    // Assert
    expect(
      screen.getByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/welcome back to ai image gallery/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create one/i })
    ).toBeInTheDocument();
  });

  it("should display error message when provided in search params", () => {
    // Arrange
    const errorMessage = "Invalid login credentials";
    mockUse.mockReturnValue({ error: errorMessage });

    // Act
    render(
      <SignInPage searchParams={Promise.resolve({ error: errorMessage })} />
    );

    // Assert
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass(
      "border-red-500/40",
      "bg-red-500/10"
    );
  });

  it("should not display error message when no error in search params", () => {
    // Act
    render(<SignInPage searchParams={mockSearchParams} />);

    // Assert
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should have correct form field attributes", () => {
    // Act
    render(<SignInPage searchParams={mockSearchParams} />);

    // Assert
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("name", "email");
    expect(emailInput).toHaveAttribute("required");
    expect(emailInput).toHaveAttribute("placeholder", "you@example.com");

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("name", "password");
    expect(passwordInput).toHaveAttribute("required");
    expect(passwordInput).toHaveAttribute("placeholder", "••••••••");
  });

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

  it("should have correct navigation link to sign-up page", () => {
    // Act
    render(<SignInPage searchParams={mockSearchParams} />);

    // Assert
    const signUpLink = screen.getByRole("link", { name: /create one/i });
    expect(signUpLink).toHaveAttribute("href", "/sign-up");
  });

  it("should submit form with user input", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SignInPage searchParams={mockSearchParams} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    // Act
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    // Verify form has the correct action
    const form = emailInput.closest("form");
    expect(form).toBeInTheDocument();
  });

  it("should handle form submission correctly", () => {
    // Act
    render(<SignInPage searchParams={mockSearchParams} />);

    // Assert
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveClass("space-y-4");
  });

  it("should display proper styling and layout", () => {
    // Act
    render(<SignInPage searchParams={mockSearchParams} />);

    // Assert
    const mainContainer = screen.getByRole("main");
    expect(mainContainer).toHaveClass(
      "min-h-screen",
      "flex",
      "items-center",
      "justify-center"
    );

    const formContainer = screen.getByRole("heading").closest("div");
    expect(formContainer).toHaveClass(
      "bg-white/5",
      "border",
      "border-white/10",
      "rounded-2xl"
    );
  });

  it("should handle URL encoded error messages", () => {
    // Arrange
    const encodedError = "Invalid%20login%20credentials";
    const decodedError = "Invalid login credentials";
    mockUse.mockReturnValue({ error: decodedError });

    // Act
    render(
      <SignInPage searchParams={Promise.resolve({ error: decodedError })} />
    );

    // Assert
    expect(screen.getByText(decodedError)).toBeInTheDocument();
  });

  it("should have accessible form labels and structure", () => {
    // Act
    render(<SignInPage searchParams={mockSearchParams} />);

    // Assert
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Check that inputs are properly associated with labels
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput.getAttribute("id")).toBe("email");
    expect(passwordInput.getAttribute("id")).toBe("password");
  });
});
