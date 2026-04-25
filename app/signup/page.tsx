"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Enums } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";

type Role = Enums<"user_role">;

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from("users").upsert({
        id: data.user.id,
        email,
        role,
      });

      if (profileError) {
        setMessage(profileError.message);
        setIsSubmitting(false);
        return;
      }

      router.push(role === "seller" ? "/dashboard" : "/");
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account, then log in.");
    setIsSubmitting(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <p className="eyebrow">Create account</p>
        <h1 id="signup-title">Sign up for Kura</h1>
        <p className="muted">
          Choose whether you want to shop as a buyer or manage lockers as a
          seller.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <fieldset>
            <legend>Role</legend>
            <label className="radio-option">
              <input
                type="radio"
                name="role"
                value="buyer"
                checked={role === "buyer"}
                onChange={() => setRole("buyer")}
              />
              Buyer
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="role"
                value="seller"
                checked={role === "seller"}
                onChange={() => setRole("seller")}
              />
              Seller
            </label>
          </fieldset>

          {message ? <p className="form-message">{message}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
