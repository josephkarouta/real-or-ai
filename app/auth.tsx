"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type AuthProps = {
  showNotice?: (message: string, action?: "auth") => void;
};

export default function Auth({ showNotice }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const notify = (message: string) => {
    if (typeof showNotice === "function") {
      showNotice(message);
    }
  };

  const clearMessages = () => {
    setAuthError(null);
    setAuthSuccess(null);
  };

  const signInWithGoogle = async () => {
    clearMessages();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  const signUp = async () => {
    clearMessages();

    if (!email || !password) {
      setAuthError("Please complete all fields.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthSuccess("Check your email to confirm signup.");
      notify("Check your email to confirm signup.");
    }
  };

  const signIn = async () => {
    clearMessages();

    if (!email || !password) {
      setAuthError("Please enter your email and password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError("Invalid email or password.");
    }
  };

  return (
    <div className="w-full">

      <div className="text-center mb-6">


        <h2 className="text-3xl font-bold">
          Welcome back
        </h2>

        <p className="text-gray-400 mt-2">
          Sign in to continue
        </p>
      </div>

      <button
        onClick={signInWithGoogle}
        className="w-full mb-5 rounded-2xl border border-white/25 bg-white/10 py-4 font-bold hover:bg-white/20 transition"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-4 mb-5 text-gray-400 text-sm">
        <div className="h-px flex-1 bg-white/15" />
        <span>or</span>
        <div className="h-px flex-1 bg-white/15" />
      </div>

      <input
        type="email"
        placeholder="Email"
        className={`w-full mb-4 p-4 rounded-2xl bg-transparent border outline-none placeholder:text-gray-400 backdrop-blur-xl transition ${
          authError ? "border-red-400 focus:border-red-400" : "border-white/25 focus:border-cyan-400"
        }`}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clearMessages();
        }}
      />

      <input
        type="password"
        placeholder="Password"
        className={`w-full mb-3 p-4 rounded-2xl bg-transparent border outline-none placeholder:text-gray-400 backdrop-blur-xl transition ${
          authError ? "border-red-400 focus:border-red-400" : "border-white/25 focus:border-cyan-400"
        }`}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          clearMessages();
        }}
      />

      {authError && (
        <div className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {authError}
        </div>
      )}

      {authSuccess && (
        <div className="mb-4 rounded-2xl border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {authSuccess}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={signIn}
          className="flex-1 bg-cyan-500 hover:bg-cyan-400 transition rounded-xl py-3 font-bold"
        >
          Sign In
        </button>

        <button
          onClick={signUp}
          className="flex-1 bg-purple-600 hover:bg-purple-500 transition rounded-xl py-3 font-bold"
        >
          Sign Up
        </button>
      </div>

    </div>
  );
}