import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SearchBar, { SearchFilters } from "@/components/SearchBar";

describe("SearchBar", () => {
  const mockOnSearchChange = jest.fn();

  const defaultProps = {
    onSearchChange: mockOnSearchChange,
    totalImages: 100,
    filteredCount: 50,
    activeFilters: {
      query: "",
      searchType: "all" as const,
      colorFilter: null,
      similarTo: null,
    } as SearchFilters,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render search input and trigger search on typing", async () => {
    render(<SearchBar {...defaultProps} />);

    // Find the search input
    const searchInput = screen.getByPlaceholderText("Search your images...");
    expect(searchInput).toBeInTheDocument();

    // Type in the search input
    fireEvent.change(searchInput, { target: { value: "sunset" } });

    // Wait for debounced search (500ms delay)
    await waitFor(
      () => {
        expect(mockOnSearchChange).toHaveBeenCalledWith({
          query: "sunset",
          searchType: "all",
          colorFilter: null,
          similarTo: null,
        });
      },
      { timeout: 1000 }
    );

    // Verify the search was called exactly once
    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
  });
});
