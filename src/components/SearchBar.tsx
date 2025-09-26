"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Filter, Tag, Palette } from "lucide-react";

export interface SearchFilters {
  query: string;
  searchType: "all" | "tags" | "description";
  colorFilter: string | null;
  similarTo: string | null; // Image ID for similarity search
}

interface SearchBarProps {
  onSearchChange: (filters: SearchFilters) => void;
  totalImages: number;
  filteredCount: number;
  activeFilters: SearchFilters;
}

export default function SearchBar({
  onSearchChange,
  totalImages,
  filteredCount,
  activeFilters,
}: SearchBarProps) {
  const [query, setQuery] = useState(activeFilters.query);
  const [searchType, setSearchType] = useState(activeFilters.searchType);
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange({
        query,
        searchType,
        colorFilter: activeFilters.colorFilter,
        similarTo: activeFilters.similarTo,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    query,
    searchType,
    activeFilters.colorFilter,
    activeFilters.similarTo,
    onSearchChange,
  ]);

  const handleClearSearch = () => {
    setQuery("");
    onSearchChange({
      query: "",
      searchType: "all",
      colorFilter: null,
      similarTo: null,
    });
  };

  const hasActiveFilters =
    query ||
    activeFilters.colorFilter ||
    activeFilters.similarTo ||
    searchType !== "all";

  const clearColorFilter = () => {
    onSearchChange({
      ...activeFilters,
      colorFilter: null,
    });
  };

  const clearSimilarFilter = () => {
    onSearchChange({
      ...activeFilters,
      similarTo: null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your images..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-20 py-3 rounded-lg border border-white/15 bg-background/60 backdrop-blur text-foreground placeholder-foreground/50 outline-none focus:ring-2 focus:ring-foreground/30 focus:border-foreground/30"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md transition-colors ${
                showFilters || searchType !== "all"
                  ? "bg-blue-500/20 text-blue-300"
                  : "hover:bg-white/10 text-foreground/60"
              }`}
              title="Search filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearSearch}
                className="p-2 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Type Filters */}
        {showFilters && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 rounded-lg border border-white/15 bg-background/95 backdrop-blur shadow-lg z-10">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Search in:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Everything", icon: Search },
                    { value: "tags", label: "Tags only", icon: Tag },
                    {
                      value: "description",
                      label: "Descriptions only",
                      icon: Filter,
                    },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSearchType(value as typeof searchType)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        searchType === value
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-white/5 text-foreground/70 hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-foreground/60">Active filters:</span>

          {activeFilters.colorFilter && (
            <div className="flex items-center gap-2 bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full text-sm">
              <div
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: activeFilters.colorFilter }}
              ></div>
              <span>Color: {activeFilters.colorFilter}</span>
              <button
                onClick={clearColorFilter}
                className="hover:text-purple-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {activeFilters.similarTo && (
            <div className="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full text-sm">
              <Palette className="w-3 h-3" />
              <span>Similar images</span>
              <button
                onClick={clearSimilarFilter}
                className="hover:text-green-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {searchType !== "all" && (
            <div className="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full text-sm">
              <Filter className="w-3 h-3" />
              <span>
                {searchType === "tags" ? "Tags only" : "Descriptions only"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Results Counter */}
      {hasActiveFilters && (
        <div className="text-sm text-foreground/60">
          Showing {filteredCount} of {totalImages} images
          {filteredCount === 0 && query && (
            <span className="text-orange-400 ml-2">
              • Try adjusting your search terms or filters
            </span>
          )}
        </div>
      )}
    </div>
  );
}
