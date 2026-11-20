"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Search,
  MessageSquare,
  Package,
  User,
  ChevronDown,
  Check,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { user, demoUsers, switchUser } = useAuth();
  const { itemCount, setDrawerOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Shopity
              </span>
            </div>
          </Link>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search laptops, headphones, chargers..."
              className="w-full bg-gray-100/80 focus:bg-white text-xs text-gray-900 pl-9 pr-4 py-2.5 rounded-xl border border-transparent focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
          </form>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Products link */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Catalog
            </Link>

            {/* My Orders */}
            <Link
              href="/orders"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">My Orders</span>
            </Link>

            {/* Dedicated Chat Page */}
            <Link
              href="/chat"
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70 px-3 py-2 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">Shopping Assistant</span>
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Open Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 rounded-xl px-2.5 py-1.5 bg-white shadow-2xs hover:bg-gray-50 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {user ? user.full_name.charAt(0) : "U"}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="leading-tight text-gray-900 truncate max-w-[100px]">
                    {user ? user.full_name : "Sign In"}
                  </div>
                  <div className="text-[10px] text-gray-400 capitalize">
                    {user?.role || "Customer"}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Active Account
                      </p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <div className="px-2 py-1.5">
                      <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Switch Customer Demo
                      </p>
                      {demoUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                            user?.id === u.id
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="text-left">
                            <span className="block font-medium">{u.full_name}</span>
                            <span className="text-[10px] text-gray-400">{u.email}</span>
                          </div>
                          {user?.id === u.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-1 px-2">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg"
                      >
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>Profile & Settings</span>
                      </Link>
                      <Link
                        href="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg"
                      >
                        <LogOut className="w-3.5 h-3.5 text-gray-400" />
                        <span>Sign In Screen</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
