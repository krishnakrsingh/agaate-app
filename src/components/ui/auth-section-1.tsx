"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { useState, type FormEvent } from "react";
import {
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  User,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthSectionOne() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.documentElement.classList.contains("dark")
      );
    }
    return false;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "light");
      if (nextDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("agaate_theme", nextDark ? "dark" : "light");
      } catch {}
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setError("Please enter your email or mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmedId, password }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setIsPending(false);
        setError(body.error ?? "Invalid mobile number, email, or password.");
        return;
      }

      const userRole = body.user?.role;
      let targetUrl = "/dashboard";
      if (userRole === "FARM_ADMIN") {
        targetUrl = "/owner/dashboard";
      } else if (userRole === "FARM_OFFICER") {
        targetUrl = "/officer/day";
      } else if (userRole === "AGRONOMIST") {
        targetUrl = "/tasks";
      }
      window.location.replace(targetUrl);
    } catch {
      setIsPending(false);
      setError("Network connectivity error. Please check your connection.");
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#f4f4f5] dark:bg-[#070709] p-3 sm:p-4 md:p-5 flex items-center justify-center font-sans transition-colors duration-300 antialiased">
      {/* 2-Column Responsive Grid: Side-by-side on all screens md and up */}
      <div className="w-full max-w-[1560px] grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 min-h-[calc(100vh-2rem)] items-stretch">
        
        {/* Left Form Card */}
        <section
          aria-label="Sign in"
          className="relative flex flex-col justify-between rounded-2xl md:rounded-3xl border border-stone-200/90 bg-white dark:border-white/[0.08] dark:bg-[#0d0d11] p-6 sm:p-8 md:p-10 xl:p-12 shadow-xl shadow-stone-200/50 dark:shadow-black/60 transition-all duration-200 min-h-[600px]"
        >
          {/* Top Row: Brand Logo & Operational Pill */}
          <div className="flex items-center justify-between gap-3">
            <BrandLogo variant="full" height={34} priority />
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="tracking-wider">PORTAL</span>
              </div>
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-100/80 text-stone-700 transition-colors hover:bg-stone-200 dark:border-white/10 dark:bg-white/[0.08] dark:text-stone-200 dark:hover:bg-white/15"
              >
                {isDark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-stone-700" />}
              </button>
            </div>
          </div>

          {/* Center Form Container */}
          <div className="my-auto py-6 sm:py-8 max-w-[420px] w-full mx-auto">
            <div className="space-y-1.5 mb-6 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Agaate Operational Intelligence
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
                Sign in to account
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-normal">
                Controlled agronomy intelligence from soil to harvest.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Info Message */}
            {infoMessage && (
              <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/90 p-3 text-xs text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300">
                <span>{infoMessage}</span>
                <button
                  type="button"
                  onClick={() => setInfoMessage(null)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Login Form: Identifier & Password Only */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Identifier */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-identifier"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400"
                >
                  Email or Mobile
                </label>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-3.5 text-stone-400 dark:text-stone-500">
                    <User className="size-4" />
                  </div>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="name@agaate.local or 9876543210"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/70 py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 transition-all focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-white/30 dark:focus:bg-white/[0.07] dark:focus:ring-white/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setInfoMessage(
                        "Please contact your estate administrator or HQ to reset credentials."
                      )
                    }
                    className="text-[11px] text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-3.5 text-stone-400 dark:text-stone-500">
                    <Lock className="size-4" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/70 py-3 pl-10 pr-11 text-sm text-stone-900 placeholder:text-stone-400 transition-all focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-white/30 dark:focus:bg-white/[0.07] dark:focus:ring-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none hover:text-stone-900 dark:hover:text-zinc-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 dark:border-stone-700 dark:bg-stone-800 cursor-pointer accent-stone-900 dark:accent-white"
                  />
                  <span>Remember device for 30 days</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending || !identifier.trim() || !password}
                className="group relative mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 text-sm font-semibold text-white shadow-md transition-all hover:bg-stone-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none dark:bg-white dark:text-stone-950 dark:hover:bg-stone-100"
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign In to Operations</span>
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Note */}
          <div className="flex items-center justify-between border-t border-stone-200/80 pt-4 text-[11px] text-stone-500 dark:border-white/[0.06] dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Enterprise AES-256 Session Auth</span>
            </div>
            <span>Agaate Intelligence</span>
          </div>
        </section>

        {/* Right Showcase Card: The Beautiful GrainGradient Agronomy Panel */}
        <section
          aria-label="Precision Agronomy Matrix"
          className="relative flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-3xl bg-black p-6 sm:p-8 md:p-10 xl:p-12 text-white shadow-2xl border border-white/10 min-h-[600px]"
        >
          {/* The signature orange/amber GrainGradient shader */}
          <GrainGradient
            speed={1}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.5}
            intensity={0.5}
            noise={0.25}
            shape="corners"
            frame={2854.5}
            colors={["#FFFFFF", "#FC7819", "#FC7819", "#FFFFFF"]}
            colorBack="#00000000"
            className="absolute inset-0 bg-black pointer-events-none"
          />

          {/* Content Overlay */}
          <div className="relative z-10 flex h-full flex-col justify-between">
            {/* Top Badge */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-white backdrop-blur-md">
                <Radio className="size-3 text-orange-400 animate-pulse" />
                <span>Precision Agronomy Matrix</span>
              </span>
            </div>

            {/* Hero Copy */}
            <div className="space-y-3.5 my-auto max-w-[540px] py-8">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[42px] leading-[1.12]">
                Controlled Agronomy Intelligence
              </h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-[480px]">
                Automated fertigation schedules, GPS geofence radar, and verified field attendance running in real-time across every plot.
              </p>
            </div>

            {/* Bottom Telemetry Status (No download windows button!) */}
            <div className="space-y-3 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                  <div className="text-xs font-bold text-orange-300">99.9% Telemetry</div>
                  <div className="text-[10px] text-white/70 mt-0.5 leading-snug">Real-time sensor mesh</div>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                  <div className="text-xs font-bold text-emerald-300">Sub-meter GPS</div>
                  <div className="text-[10px] text-white/70 mt-0.5 leading-snug">Geofenced radar dispatch</div>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                  <div className="text-xs font-bold text-sky-300">Offline-First</div>
                  <div className="text-[10px] text-white/70 mt-0.5 leading-snug">Continuous edge sync</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/15">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-medium text-white/80">Agronomy Engine Live</span>
                </div>
                <span>Sub-meter GPS Radar</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
