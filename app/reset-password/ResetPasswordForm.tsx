"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

type ViewState = "loading" | "form" | "invalid";

function hasRecoveryInUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const hash = window.location.hash;
  if (
    hash.includes("type=recovery") ||
    hash.includes("type%3Drecovery")
  ) {
    return true;
  }
  const sp = new URLSearchParams(window.location.search);
  return sp.has("code");
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<ViewState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gotRecovery = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!hasRecoveryInUrl()) {
      setView("invalid");
      router.replace("/forgot-password");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          gotRecovery.current = true;
          setView("form");
        }
      }
    );

    const fallback = window.setTimeout(() => {
      if (gotRecovery.current) {
        return;
      }
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setView("form");
        } else {
          setView("invalid");
          router.replace("/forgot-password");
        }
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(fallback);
    };
  }, [router, supabase]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login?reset=1");
    router.refresh();
  }

  if (view === "invalid") {
    return null;
  }

  if (view === "loading") {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-live="polite">
          <h1>Reset password</h1>
          <p className="muted">Verifying your reset link…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <p className="eyebrow">Account</p>
        <h1 id="reset-title">Set a new password</h1>
        <p className="muted">Choose a new password for your account.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
          />

          {message ? <p className="form-message">{message}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Update password"}
          </button>
        </form>

        <p className="auth-switch">
          <Link href="/login">Back to log in</Link>
        </p>
      </section>
    </main>
  );
}
