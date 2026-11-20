"use client";

import React from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Shield,
  MapPin,
  Tag,
  DollarSign,
  AlertCircle,
  Package,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user, demoUsers, switchUser } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Account & Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          View customer preferences, registered addresses, and security guardrail policies.
        </p>
      </div>

      {/* Main Profile Information */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20">
              {user ? user.full_name.charAt(0) : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{user?.full_name}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl">
            Customer ID #{user?.id}
          </div>
        </div>

        {/* Read-Only Invariant Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed space-y-1">
            <span className="font-bold">System Guardrail: Profile Data is Read-Only via Chat</span>
            <p>
              Customer personal information and primary shipping addresses are strictly read-only.
              Neither users nor the AI assistant can alter personal credentials or addresses
              through chat prompts, preventing prompt injection identity changes.
            </p>
          </div>
        </div>

        {/* Preferences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Brand Preferences */}
          <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>Preferred Brands</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user?.preferences?.preferred_brands?.length ? (
                user.preferences.preferred_brands.map((b: string) => (
                  <span
                    key={b}
                    className="text-xs font-bold px-3 py-1 rounded-xl bg-white text-blue-700 border border-blue-200 shadow-2xs"
                  >
                    {b}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">No brand affinity declared.</span>
              )}
            </div>
          </div>

          {/* Budget Constraint */}
          <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Budget Constraint</span>
            </div>
            <div>
              {user?.preferences?.budget_inr ? (
                <div className="text-xl font-black text-gray-900">
                  ₹{user.preferences.budget_inr.toLocaleString("en-IN")}
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    (Injected into agent prompts)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-400">No strict budget configured.</span>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-2 md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Registered Shipping Address</span>
            </div>
            <div className="text-xs text-gray-800 font-medium leading-relaxed">
              45 MG Road, Indiranagar, Bengaluru, KA 560038, India
            </div>
          </div>
        </div>
      </div>

      {/* Demo Switcher Quick Section */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900">
          Switch Seeded Demo Profiles
        </h3>
        <p className="text-xs text-gray-500">
          Click any persona below to immediately simulate their distinct shopping history, cart items, and AI context:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {demoUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => switchUser(u)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                user?.id === u.id
                  ? "bg-blue-50 border-blue-400 shadow-xs ring-2 ring-blue-100"
                  : "bg-gray-50/50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="text-xs font-bold text-gray-900">{u.full_name}</div>
              <div className="text-[11px] text-gray-500">{u.email}</div>
              <div className="mt-2 text-[10px] text-blue-600 font-semibold uppercase">
                {u.preferences?.preferred_brands
                  ? u.preferences.preferred_brands.join(", ")
                  : u.role}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
