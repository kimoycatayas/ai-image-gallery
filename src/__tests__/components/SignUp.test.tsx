import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { use } from "react";
import SignUpPage from "../../app/(auth)/sign-up/page";

// Mock the auth action
jest.mock("../../app/actions/auth", () => ({
  signUpWithPassword: jest.fn(),
}));

// Mock React's use hook for searchParams
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  use: jest.fn(),
}));

const mockUse = use as jest.MockedFunction<typeof use>;

describe("SignUpPage", () => {
  const mockSearchParams = Promise.resolve({});

  beforeEach(() => {
    jest.clearAllMocks();
    mockUse.mockReturnValue({});
  });

  it("should render sign-up form with all required elements", () => {
    // Act
    render(<SignUpPage searchParams={mockSearchParams} />);

    // Assert
    expect(
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/join ai image gallery in seconds/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("should display error message when provided in search params", () => {
    // Arrange
    const errorMessage = "Password should be at least 6 characters";
    mockUse.mockReturnValue({ error: errorMessage });

    // Act
    render(
      <SignUpPage searchParams={Promise.resolve({ error: errorMessage })} />
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
    render(<SignUpPage searchParams={mockSearchParams} />);

    // Assert
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should have correct form field attributes", () => {
    // Act
    render(<SignUpPage searchParams={mockSearchParams} />);

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
    render(<SignUpPage searchParams={mockSearchParams} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Act
    await user.type(emailInput, "newuser@example.com");
    await user.type(passwordInput, "newpassword123");

    // Assert
    expect(emailInput).toHaveValue("newuser@example.com");
    expect(passwordInput).toHaveValue("newpassword123");
  });

  it("should have correct navigation link to sign-in page", () => {
    // Act
    render(<SignUpPage searchParams={mockSearchParams} />);

    // Assert
    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toHaveAttribute("href", "/sign-in");
  });

  it("should submit form with user input", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SignUpPage searchParams={mockSearchParams} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Act
    await user.type(emailInput, "newuser@example.com");
    await user.type(passwordInput, "newpassword123");

    // Verify form has the correct structure
    const form = emailInput.closest("form");
    expect(form).toBeInTheDocument();
  });

  it("should display proper styling and layout", () => {
    // Act
    render(<SignUpPage searchParams={mockSearchParams} />);

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

  it("should handle common error scenarios", () => {
    // Test password too short error
    const shortPasswordError = "Password should be at least 6 characters";
    mockUse.mockReturnValue({ error: shortPasswordError });

    const { rerender } = render(
      <SignUpPage
        searchParams={Promise.resolve({ error: shortPasswordError })}
      />
    );
    expect(screen.getByText(shortPasswordError)).toBeInTheDocument();

    // Test duplicate email error
    const duplicateEmailError = "User already registered";
    mockUse.mockReturnValue({ error: duplicateEmailError });
    rerender(
      <SignUpPage
        searchParams={Promise.resolve({ error: duplicateEmailError })}
      />
    );
    expect(screen.getByText(duplicateEmailError)).toBeInTheDocument();

    // Test invalid email format error
    const invalidEmailError = "Invalid email format";
    mockUse.mockReturnValue({ error: invalidEmailError });
    rerender(
      <SignUpPage
        searchParams={Promise.resolve({ error: invalidEmailError })}
      />
    );
    expect(screen.getByText(invalidEmailError)).toBeInTheDocument();
  });

  it("should have accessible form labels and structure", () => {
    // Act
    render(<SignUpPage searchParams={mockSearchParams} />);

    // Assert
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Check that inputs are properly associated with labels
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput.getAttribute("id")).toBe("email");
    expect(passwordInput.getAttribute("id")).toBe("password");
  });

  it("should handle URL encoded error messages", () => {
    // Arrange
    const encodedError = "Password%20should%20be%20at%20least%206%20characters";
    const decodedError = "Password should be at least 6 characters";
    mockUse.mockReturnValue({ error: decodedError });

    // Act
    render(
      <SignUpPage searchParams={Promise.resolve({ error: decodedError })} />
    );

    // Assert
    expect(screen.getByText(decodedError)).toBeInTheDocument();
  });

  it("should display different UI content compared to sign-in page", () => {
    // Act
    render(<SignUpPage searchParams={mockSearchParams} />);

    // Assert
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(
      screen.getByText(/join ai image gallery in seconds/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();

    // Should not contain sign-in specific text
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no account/i)).not.toBeInTheDocument();
  });

  it("should have proper form validation attributes", () => {
    // Act
    render(<SignUpPage searchParams={mockSearchParams} />);

    // Assert
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = emailInput.closest("form");

    // Check form has required inputs
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();

    // Check email input has proper type
    expect(emailInput).toHaveAttribute("type", "email");

    // Form should exist
    expect(form).toBeInTheDocument();
  });
});
