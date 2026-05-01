"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

type Props = {
  email: string;
};

export default function AccountPasswordForm({ email }: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function closePasswordForm() {
    setOpen(false);
    setError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function toggleOpen() {
    if (open) {
      closePasswordForm();
    } else {
      setError("");
      setOpen(true);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      setIsSubmitting(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      setIsSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (authError) {
      setError(
        authError.message.toLowerCase().includes("invalid")
          ? "Current password is wrong."
          : authError.message
      );
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Your password was updated.");
    setOpen(false);
    setIsSubmitting(false);
  }

  return (
    <>
      {success ? (
        <p className="form-message form-message-success" role="status">
          {success}
        </p>
      ) : null}

      <button type="button" className="button-ghost" onClick={toggleOpen}>
        {open ? "Close" : "Change Password"}
      </button>

      {open ? (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="account-current-password">Current password</label>
          <input
            id="account-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <label htmlFor="account-new-password">New password</label>
          <input
            id="account-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <label htmlFor="account-confirm-password">Confirm new password</label>
          <input
            id="account-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error ? (
            <p className="form-message" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save password"}
          </button>

          <p className="muted small">
            <button
              type="button"
              className="link-button text-link"
              onClick={closePasswordForm}
            >
              Cancel
            </button>
          </p>
        </form>
      ) : null}
    </>
  );
}
