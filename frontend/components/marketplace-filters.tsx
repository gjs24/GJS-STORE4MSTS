"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Filter,
  RotateCcw,
  X,
  ChevronDown,
  Check,
  Layers,
  TrainFront,
  Tag,
  Clock,
  Flame,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import type { Category } from "@/lib/api";

interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
}

interface ThemedDropdownProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  options: DropdownOption[];
  onChange: (val: string) => void;
  disabled?: boolean;
}

function ThemedDropdown({ label, value, icon, options, onChange, disabled }: ThemedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const isActive = Boolean(value && value !== "");

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`group relative flex h-[48px] w-full items-center justify-between gap-2 rounded-xl border px-3 text-left transition-all duration-200 outline-none ${
          isActive
            ? "border-rail-amber/60 bg-rail-amber/10 text-white shadow-[0_0_15px_rgba(255,138,31,0.18)]"
            : isOpen
              ? "border-rail-red bg-[#0c1424] text-white ring-1 ring-rail-red/40"
              : "border-white/10 bg-gradient-to-b from-[#0e1626]/90 to-[#070c17]/95 text-slate-300 hover:border-rail-amber/40 hover:bg-[#121c30]"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Themed Icon Box */}
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? "bg-rail-amber/20 text-rail-amber"
                : isOpen
                  ? "bg-rail-red/20 text-rail-red"
                  : "bg-white/5 text-slate-400 group-hover:text-rail-amber"
            }`}
          >
            {icon}
          </div>

          {/* Label and Value */}
          <div className="flex flex-col leading-tight truncate">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </span>
            <span
              className={`truncate text-xs sm:text-sm font-medium ${
                isActive ? "text-rail-amber font-semibold" : "text-white"
              }`}
            >
              {selectedOption ? selectedOption.label : label}
            </span>
          </div>
        </div>

        {/* Chevron Indicator */}
        <div className="flex shrink-0 items-center pl-1">
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              isOpen
                ? "rotate-180 text-rail-red"
                : isActive
                  ? "text-rail-amber"
                  : "text-slate-400 group-hover:text-rail-amber"
            }`}
          />
        </div>
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-2 w-full min-w-[210px] max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-[#090e1a]/98 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(239,59,45,0.15)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm transition-all text-left ${
                    isSelected
                      ? "border-l-2 border-rail-red bg-rail-red/20 font-bold text-white shadow-inner"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-rail-amber" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MarketplaceFiltersProps {
  categories: Category[];
  initialParams: Record<string, string | undefined>;
  totalCount: number;
}

export function MarketplaceFilters({ categories, initialParams, totalCount }: MarketplaceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Controlled text inputs for search and version
  const [searchQuery, setSearchQuery] = useState(initialParams.search || "");
  const [versionQuery, setVersionQuery] = useState(initialParams.version || "");

  // Synchronize when URL search params change externally (e.g. back/forward button)
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setVersionQuery(searchParams.get("version") || "");
  }, [searchParams]);

  // Push new query parameters to the URL
  const pushParams = useCallback(
    (newParams: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, val]) => {
        if (!val || val.trim() === "") {
          current.delete(key);
        } else {
          current.set(key, val);
        }
      });

      const queryString = current.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.push(targetUrl);
      });
    },
    [pathname, router, searchParams]
  );

  // Instant dropdown update
  const handleDropdownChange = (key: string, value: string) => {
    pushParams({ [key]: value });
  };

  // Form submit for text fields
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams({
      search: searchQuery.trim(),
      version: versionQuery.trim(),
    });
  };

  // Clear all filters
  const handleClearAll = () => {
    setSearchQuery("");
    setVersionQuery("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  // Current active values
  const currentCategory = searchParams.get("category") || "";
  const currentSimulator = searchParams.get("simulator_type") || "";
  const currentPrice = searchParams.get("price") || "";
  const currentUpcoming = searchParams.get("upcoming") || "";
  const currentDeal = searchParams.get("deal") || "";
  const activeSearch = searchParams.get("search") || "";
  const activeVersion = searchParams.get("version") || "";

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    currentCategory ||
      currentSimulator ||
      currentPrice ||
      currentUpcoming ||
      currentDeal ||
      activeSearch ||
      activeVersion
  );

  // Dropdown options configurations
  const categoryOptions: DropdownOption[] = [
    { value: "", label: "All Categories" },
    ...categories.map((cat) => ({
      value: cat.slug,
      label: cat.name,
      badge: cat.asset_count ? `${cat.asset_count}` : undefined,
    })),
  ];

  const simulatorOptions: DropdownOption[] = [
    { value: "", label: "All Simulators" },
    { value: "BOTH", label: "MSTS + Open Rails" },
    { value: "MSTS", label: "MSTS Only" },
    { value: "OPEN_RAILS", label: "Open Rails Only" },
  ];

  const priceOptions: DropdownOption[] = [
    { value: "", label: "Any Pricing" },
    { value: "free", label: "Free Downloads" },
    { value: "premium", label: "Premium (INR)" },
  ];

  const statusOptions: DropdownOption[] = [
    { value: "", label: "Any Status" },
    { value: "true", label: "Coming Soon" },
  ];

  const dealOptions: DropdownOption[] = [
    { value: "", label: "Any Offer" },
    { value: "true", label: "Deals Open" },
  ];

  return (
    <div className="relative z-20 mb-8 space-y-4">
      {/* Main Filter Container */}
      <div className="glass-panel relative rounded-2xl border border-white/10 p-4 sm:p-5 shadow-2xl">
        {/* Subtle Loading Shimmer when updating */}
        {isPending && (
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl bg-white/5">
            <div className="h-full bg-gradient-to-r from-rail-red via-rail-amber to-rail-red animate-pulse" />
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Top Row: Search input, Version, and Submit Button */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by locomotive model, route, roll stock, pack..."
                className="w-full rounded-xl border border-white/10 bg-[#070c17]/80 pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 transition-all focus:border-rail-red focus:bg-[#0c1424] focus:outline-none focus:ring-1 focus:ring-rail-red"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    pushParams({ search: null });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Version Input & Search Action */}
            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={versionQuery}
                  onChange={(e) => setVersionQuery(e.target.value)}
                  placeholder="v1.0"
                  className="w-24 rounded-xl border border-white/10 bg-[#070c17]/80 px-3 py-3 text-sm text-white placeholder:text-slate-500 transition-all focus:border-rail-red focus:bg-[#0c1424] focus:outline-none focus:ring-1 focus:ring-rail-red"
                  title="Filter by version string"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 rounded-xl bg-rail-red px-5 py-3 text-sm font-bold text-white shadow-glow transition-all hover:bg-rail-red/90 active:scale-95 disabled:opacity-70"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Filter size={16} />
                )}
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Secondary Row: 5 Railway-Themed Custom Dropdowns */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-slate-400">
                <SlidersHorizontal size={13} className="text-rail-amber" />
                <span>Depot Filters</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-xs font-semibold text-rail-amber hover:underline"
                >
                  <RotateCcw size={12} />
                  <span>Reset All</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Dropdown 1: Category */}
              <ThemedDropdown
                label="Category"
                value={currentCategory}
                icon={<Layers size={15} />}
                options={categoryOptions}
                onChange={(val) => handleDropdownChange("category", val)}
                disabled={isPending}
              />

              {/* Dropdown 2: Simulator */}
              <ThemedDropdown
                label="Simulator"
                value={currentSimulator}
                icon={<TrainFront size={15} />}
                options={simulatorOptions}
                onChange={(val) => handleDropdownChange("simulator_type", val)}
                disabled={isPending}
              />

              {/* Dropdown 3: Pricing */}
              <ThemedDropdown
                label="Pricing"
                value={currentPrice}
                icon={<Tag size={15} />}
                options={priceOptions}
                onChange={(val) => handleDropdownChange("price", val)}
                disabled={isPending}
              />

              {/* Dropdown 4: Status */}
              <ThemedDropdown
                label="Status"
                value={currentUpcoming}
                icon={<Clock size={15} />}
                options={statusOptions}
                onChange={(val) => handleDropdownChange("upcoming", val)}
                disabled={isPending}
              />

              {/* Dropdown 5: Deals / Offers */}
              <ThemedDropdown
                label="Offers"
                value={currentDeal}
                icon={<Flame size={15} />}
                options={dealOptions}
                onChange={(val) => handleDropdownChange("deal", val)}
                disabled={isPending}
              />
            </div>
          </div>
        </form>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active:
            </span>

            {activeSearch && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                <span>Search: &ldquo;{activeSearch}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    pushParams({ search: null });
                  }}
                  className="text-slate-400 hover:text-white"
                  title="Remove search filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {activeVersion && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                <span>v{activeVersion}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVersionQuery("");
                    pushParams({ version: null });
                  }}
                  className="text-slate-400 hover:text-white"
                  title="Remove version filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {currentCategory && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-rail-amber/40 bg-rail-amber/10 px-2.5 py-1 text-xs font-medium text-rail-amber">
                <span>
                  {categories.find((c) => c.slug === currentCategory)?.name || currentCategory}
                </span>
                <button
                  type="button"
                  onClick={() => handleDropdownChange("category", "")}
                  className="text-rail-amber/80 hover:text-rail-amber"
                  title="Remove category filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {currentSimulator && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-rail-amber/40 bg-rail-amber/10 px-2.5 py-1 text-xs font-medium text-rail-amber">
                <span>
                  {currentSimulator === "BOTH"
                    ? "MSTS + Open Rails"
                    : currentSimulator === "MSTS"
                      ? "MSTS Only"
                      : "Open Rails Only"}
                </span>
                <button
                  type="button"
                  onClick={() => handleDropdownChange("simulator_type", "")}
                  className="text-rail-amber/80 hover:text-rail-amber"
                  title="Remove simulator filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {currentPrice && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-rail-amber/40 bg-rail-amber/10 px-2.5 py-1 text-xs font-medium text-rail-amber">
                <span>{currentPrice === "free" ? "Free Downloads" : "Premium"}</span>
                <button
                  type="button"
                  onClick={() => handleDropdownChange("price", "")}
                  className="text-rail-amber/80 hover:text-rail-amber"
                  title="Remove price filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {currentUpcoming && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-rail-amber/40 bg-rail-amber/10 px-2.5 py-1 text-xs font-medium text-rail-amber">
                <span>Coming Soon</span>
                <button
                  type="button"
                  onClick={() => handleDropdownChange("upcoming", "")}
                  className="text-rail-amber/80 hover:text-rail-amber"
                  title="Remove status filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {currentDeal && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-rail-amber/40 bg-rail-amber/10 px-2.5 py-1 text-xs font-medium text-rail-amber">
                <span>Deals Open</span>
                <button
                  type="button"
                  onClick={() => handleDropdownChange("deal", "")}
                  className="text-rail-amber/80 hover:text-rail-amber"
                  title="Remove deals filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <RotateCcw size={12} />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

