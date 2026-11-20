"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Loader2,
  Sparkles,
} from "lucide-react";
import { fetchFilters, fetchProducts } from "@/lib/api";
import { AvailableFiltersResponse, PaginatedProductsResponse } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

function CatalogContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { setFloatingOpen, sendMessage } = useChat();

  const queryParam = searchParams.get("q") || "";

  // Data states
  const [productsData, setProductsData] = useState<PaginatedProductsResponse | null>(null);
  const [filtersData, setFiltersData] = useState<AvailableFiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("relevance");
  const [currentPage, setCurrentPage] = useState(1);

  // Bounds
  const minPriceBound = filtersData?.price_range?.min_price_inr ?? filtersData?.price_range?.min ?? 0;
  const maxPriceBound = filtersData?.price_range?.max_price_inr ?? filtersData?.price_range?.max ?? 100000;

  // Load available filters on mount
  useEffect(() => {
    fetchFilters()
      .then((res) => {
        setFiltersData(res);
        const maxVal = res.price_range?.max_price_inr ?? res.price_range?.max;
        if (maxVal) {
          setMaxPrice(maxVal);
        }
      })
      .catch((err) => console.warn("Failed to load filters:", err));
  }, []);

  // Fetch products whenever filters or page change
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts(
        {
          q: queryParam || undefined,
          category_id: selectedCategory,
          brand: selectedBrand,
          max_price: maxPrice,
          in_stock_only: inStockOnly,
          tag: selectedTag,
          sort_by: sortBy,
          page: currentPage,
          page_size: 9,
        },
        user?.id
      );
      setProductsData(data);
    } catch (err) {
      console.warn("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }, [
    queryParam,
    selectedCategory,
    selectedBrand,
    maxPrice,
    inStockOnly,
    selectedTag,
    sortBy,
    currentPage,
    user,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setMaxPrice(maxPriceBound);
    setInStockOnly(false);
    setSelectedTag(null);
    setSortBy("relevance");
    setCurrentPage(1);
  };

  const handleAskAgentForRecommendations = () => {
    setFloatingOpen(true);
    sendMessage(
      user?.preferences?.preferred_brands
        ? `What laptops do you recommend for me based on my preferences for ${user.preferences.preferred_brands.join(", ")} and budget of ₹${user.preferences.budget_inr || 60000}?`
        : "What are your best rated laptops and audio products right now?"
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner / Personalization Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI-Assisted Shopping</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Welcome back, {user ? user.full_name : "Shopper"}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed mb-4">
            {user?.preferences?.preferred_brands
              ? `Personalized recommendations active for ${user.preferences.preferred_brands.join(" & ")} with budget ₹${(user.preferences.budget_inr || 60000).toLocaleString("en-IN")}.`
              : "Discover enterprise-grade laptops, audio gear, and electronics verified with real-time inventory."}
          </p>

          <button
            onClick={handleAskAgentForRecommendations}
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Ask AI for Tailored Recommendations</span>
          </button>
        </div>
      </div>

      {/* Main Catalog Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Filters</span>
            </div>
            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
              Categories
            </h4>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>All Categories</span>
              </button>
              {filtersData?.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{cat.name}</span>
                  {typeof cat.count === "number" && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {cat.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Brands */}
          {filtersData && filtersData.brands.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                Brands
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {filtersData.brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setSelectedBrand(selectedBrand === b ? null : b);
                      setCurrentPage(1);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      selectedBrand === b
                        ? "bg-blue-600 text-white border-blue-600 font-semibold"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          {filtersData && (
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Max Price
                </h4>
                <span className="text-xs font-bold text-gray-900">
                  ₹{(maxPrice || maxPriceBound).toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min={minPriceBound}
                max={maxPriceBound}
                step={1000}
                value={maxPrice || maxPriceBound}
                onChange={(e) => {
                  setMaxPrice(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>₹{minPriceBound.toLocaleString("en-IN")}</span>
                <span>₹{maxPriceBound.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          {/* In-Stock Toggle */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-gray-700">In-Stock Only</span>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 text-blue-600 rounded-sm border-gray-300 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Tags */}
          {filtersData && filtersData.tags.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Popular Tags
              </h4>
              <div className="flex flex-wrap gap-1">
                {filtersData.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTag(selectedTag === t ? null : t);
                      setCurrentPage(1);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition-all ${
                      selectedTag === t
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Products Grid & Results Area */}
        <section className="lg:col-span-3 space-y-5">
          {/* Top Results Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="text-xs text-gray-600">
              {queryParam ? (
                <span>
                  Search results for{" "}
                  <strong className="text-gray-900 font-semibold">"{queryParam}"</strong>:{" "}
                </span>
              ) : null}
              <span>
                Found <strong className="text-gray-900 font-semibold">{productsData?.total || 0}</strong> products
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Product Grid / Loading State */}
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200/80">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
              <p className="text-xs text-gray-500 font-medium">Loading catalog products...</p>
            </div>
          ) : !productsData || productsData.items.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200/80 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <PackageOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No products match your criteria</h3>
              <p className="text-xs text-gray-500 max-w-sm mb-4">
                Try widening your price range, clearing some filters, or asking the AI assistant.
              </p>
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {productsData.items.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {productsData && productsData.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="text-xs text-gray-500 px-3">
                Page <strong className="text-gray-900">{currentPage}</strong> of{" "}
                <strong className="text-gray-900">{productsData.total_pages}</strong>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(productsData.total_pages, p + 1))}
                disabled={currentPage >= productsData.total_pages}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
