"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignup) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined
          }
        });

        if (signUpErr) throw signUpErr;

        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;

        router.push("/");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6 md:p-8">
        <p className="text-xl font-bold tracking-tight text-slate-900">Huntern</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 mb-1">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {isSignup ? "Start tracking applications in seconds." : "Log in to your job tracker."}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2.5 px-4 shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "Loading..." : isSignup ? "Sign up" : "Log in"}
          </button>

          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
        </form>
      </div>
    </main>
  );
}
