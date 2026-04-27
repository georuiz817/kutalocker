"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    if (typeof window === "undefined") {
      setIsSubmitting(false);
      return;
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    if (sendError) {
      setError(sendError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(
      "If an account exists for that email, we sent a link to reset your password."
    );
    setIsSubmitting(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-title">
        <p className="eyebrow">Account</p>
        <h1 id="forgot-title">Forgot your password</h1>
        <p className="muted">Enter your email and we will send a reset link.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error ? <p className="form-message">{error}</p> : null}
          {message ? (
            <p className="form-message form-message-success" role="status">
              {message}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="auth-switch">
          <Link href="/login">Back to log in</Link>
        </p>
      </section>
    </main>
  );
}
