"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [authError, setAuthError] = useState(error === "auth_failed" ? "Authentication failed. Please try again." : "");

  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    });
    if (error) setAuthError(error.message);
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.04]">
        <img src="/styles/quiet_luxury.png" alt="" className="w-full h-full object-cover" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center shadow-lg">
            <span className="font-serif text-white font-bold text-lg">S</span>
          </div>
          <span className="font-serif text-3xl tracking-wide text-white">
            Stage<span className="text-gold">AI</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-7 space-y-5">
          <div className="text-center">
            <h1 className="font-serif text-xl text-navy">Welcome</h1>
            <p className="text-sm text-slate mt-1">Sign in to stage your listings</p>
          </div>

          {authError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0" />
              {authError}
            </div>
          )}

          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-green-500" />
              </div>
              <p className="text-sm text-navy font-medium">Check your email</p>
              <p className="text-xs text-slate mt-1">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-xs text-gold hover:text-gold-dark mt-4"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 border border-navy/10 rounded-xl py-2.5 text-sm text-navy font-medium hover:bg-ivory-light transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-navy/10" />
                <span className="text-[10px] text-slate uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-navy/10" />
              </div>

              {/* Magic link */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-navy/10 bg-ivory-light/30 text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  {loading ? "Sending..." : "Send Magic Link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-white/30 mt-6">
          By signing in, you agree to our Terms of Service.
        </p>

        <Link
          href="/"
          className="block text-center text-xs text-white/40 hover:text-white/60 mt-3 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
