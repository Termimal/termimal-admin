export const dynamic = 'force-dynamic'
﻿"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginView = "standard" | "sso";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState("");
  
  // UI states
  const [view, setView] = useState<LoginView>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/admin" }
    });

    if (otpError) setError(otpError.message);
    else setMessage("Check your email for the magic link!");
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }
    setLoading(true);
    setError("");
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/admin/settings",
    });

    if (resetError) setError(resetError.message);
    else setMessage("Password reset instructions sent to your email.");
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError("");
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + "/admin" }
    });
    if (signInError) setError(signInError.message);
  };

  const handleSSOLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: ssoError } = await supabase.auth.signInWithSSO({
      domain,
      options: { redirectTo: window.location.origin + "/admin" }
    });

    if (data?.url) {
      window.location.href = data.url;
    } else if (ssoError) {
      setError(ssoError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      
      <div className="w-full max-w-[400px] p-6 sm:p-8 rounded-2xl shadow-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        
        {/* Logo Header */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 rounded-[3px] rotate-45 border-2" style={{ borderColor: 'var(--acc)', opacity: 0.5 }} />
            <div className="absolute inset-[3px] rounded-[2px] rotate-45" style={{ background: 'var(--acc)' }} />
          </div>
          <span className="text-xl font-bold tracking-tight">Termimal Admin</span>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 mb-4 text-xs rounded-lg font-medium text-center" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red-val)' }}>
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 mb-4 text-xs rounded-lg font-medium text-center" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--green-val)' }}>
            {message}
          </div>
        )}

        {view === "standard" ? (
          <>
            {/* Standard Email Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t3)' }}>Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all focus:ring-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)', '--tw-ring-color': 'var(--acc)' } as any}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium" style={{ color: 'var(--t3)' }}>Password</label>
                  <button type="button" onClick={handleResetPassword} className="text-[0.65rem] font-medium hover:underline" style={{ color: 'var(--acc)' }}>
                    Forgot?
                  </button>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all focus:ring-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)', '--tw-ring-color': 'var(--acc)' } as any}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 mt-2"
                style={{ background: 'var(--acc)', color: 'white' }}
              >
                {loading ? "Processing..." : "Sign in"}
              </button>
            </form>

            <button 
              type="button" 
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full text-xs font-medium py-2 mb-6 hover:underline"
              style={{ color: 'var(--t3)' }}
            >
              Send me a magic link instead
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-2 mb-6">
              <div className="flex-grow border-t" style={{ borderColor: 'var(--border)' }}></div>
              <span className="flex-shrink-0 mx-4 text-xs font-medium" style={{ color: 'var(--t4)' }}>
                OR CONTINUE WITH
              </span>
              <div className="flex-grow border-t" style={{ borderColor: 'var(--border)' }}></div>
            </div>

            <div className="space-y-3">
              {/* Google Button */}
              <button 
                onClick={handleGoogleLogin}
                type="button"
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>

              {/* SSO Switch Button */}
              <button 
                onClick={() => setView("sso")}
                type="button"
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              >
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Single Sign-On (SAML)
              </button>
            </div>
          </>
        ) : (
          <>
            {/* SSO Form */}
            <form onSubmit={handleSSOLogin} className="space-y-4 mb-6">
              <p className="text-xs mb-4 text-center" style={{ color: 'var(--t3)' }}>
                Enter your company domain to be redirected to your identity provider.
              </p>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t3)' }}>Company Domain</label>
                <input 
                  type="text" 
                  placeholder="e.g. acme.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all focus:ring-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)', '--tw-ring-color': 'var(--acc)' } as any}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 mt-2"
                style={{ background: 'var(--acc)', color: 'white' }}
              >
                {loading ? "Redirecting..." : "Continue with SSO"}
              </button>
            </form>

            <button 
              onClick={() => setView("standard")}
              type="button"
              className="w-full text-xs font-medium py-2 flex items-center justify-center gap-1 hover:underline"
              style={{ color: 'var(--t3)' }}
            >
              &larr; Back to standard login
            </button>
          </>
        )}

      </div>
    </div>
  );
}
