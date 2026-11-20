"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  User,
  Mail,
  CheckCircle2,
  Lock,
  Tag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, demoUsers, switchUser, loginWithEmail } = useAuth();

  const [emailInput, setEmailInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSelectUser = (u: any) => {
    switchUser(u);
    router.push("/");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const ok = await loginWithEmail(emailInput);
    if (ok) {
      router.push("/");
    } else {
      setErrorMsg("Email not found in seeded customer profiles. Please select one of the cards below.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Shopity Demo Authentication
        </h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Select a customer persona below or sign in with their email address to simulate personalized recommendations, cart sessions, and past orders.
        </p>
      </div>

      {/* Manual Email Input */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Sign In with Email
        </h3>

        <form onSubmit={handleEmailSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. asha@example.test or rahul@example.test"
              className="w-full text-xs bg-gray-50 focus:bg-white text-gray-900 pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {errorMsg && (
          <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
        )}
      </div>

      {/* Persona Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Or Choose a Seeded Persona (1-Click)
          </h3>
          {user && (
            <span className="text-[11px] text-gray-500">
              Current: <strong className="text-blue-700">{user.full_name}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {demoUsers.map((u) => {
            const isCurrent = user?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-100"
                    : "bg-white border-gray-200/80 hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                      ID #{u.id} • {u.role}
                    </span>
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-gray-900 text-sm mb-0.5">{u.full_name}</h4>
                  <p className="text-xs text-gray-500 mb-3">{u.email}</p>

                  <div className="space-y-1 text-[11px] text-gray-600 border-t border-gray-100 pt-2.5">
                    {u.preferences?.preferred_brands && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span>Brands: <strong>{u.preferences.preferred_brands.join(", ")}</strong></span>
                      </div>
                    )}
                    {u.preferences?.budget_inr && (
                      <div>
                        Budget limit: <strong>₹{u.preferences.budget_inr.toLocaleString("en-IN")}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>Switch and Enter Store</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
