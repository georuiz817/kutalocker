"use client";

import { useState, useTransition } from "react";
import { updatePayoutInfo, type UpdatePayoutResult } from "./actions";

type Props = {
  initialPayoutMethod: "venmo" | "paypal" | null;
  initialPayoutHandle: string | null;
};

const DEFAULT_METHOD: "venmo" | "paypal" = "venmo";

export default function PayoutInformationCard({
  initialPayoutMethod,
  initialPayoutHandle,
}: Props) {
  const [method, setMethod] = useState<"venmo" | "paypal">(
    initialPayoutMethod ?? DEFAULT_METHOD
  );
  const [handle, setHandle] = useState(initialPayoutHandle ?? "");
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(null);
    setFormError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(() => {
      void (async () => {
        const r: UpdatePayoutResult = await updatePayoutInfo(null, fd);
        if (r.ok) {
          setSuccess(r.message);
        } else {
          setFormError(r.error);
        }
      })();
    });
  }

  return (
    <section
      className="dashboard-orders dashboard-payout"
      aria-labelledby="payout-title"
    >
      <h2 className="dashboard-orders-title" id="payout-title">
        Payout Information
      </h2>
      <p className="muted small dashboard-orders-lead">
        This is how you will receive payment for your sales
      </p>

      <div className="panel seller-order-card dashboard-payout-card">
        <form className="payout-form" onSubmit={onSubmit}>
          <fieldset className="payout-fieldset">
            <legend className="payout-legend">Payout method</legend>
            <div className="payout-radios">
              <label className="payout-radio-label">
                <input
                  type="radio"
                  name="payoutMethodRadio"
                  value="venmo"
                  checked={method === "venmo"}
                  onChange={() => setMethod("venmo")}
                />
                Venmo
              </label>
              <label className="payout-radio-label">
                <input
                  type="radio"
                  name="payoutMethodRadio"
                  value="paypal"
                  checked={method === "paypal"}
                  onChange={() => setMethod("paypal")}
                />
                PayPal
              </label>
            </div>
            <input type="hidden" name="payoutMethod" value={method} readOnly />
          </fieldset>

          <div className="payout-field">
            <label className="payout-input-label" htmlFor="payoutHandle">
              Account handle
            </label>
            <input
              id="payoutHandle"
              className="payout-text-input"
              name="payoutHandle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@username or you@email.com"
              autoComplete="off"
            />
            <p className="muted small payout-input-hint">
              Your Venmo @ handle or the PayPal email for receiving payouts
            </p>
          </div>

          {formError ? (
            <p className="payout-error" role="alert">
              {formError}
            </p>
          ) : null}
          {success ? (
            <p className="payout-success" role="status">
              {success}
            </p>
          ) : null}

          <div className="payout-actions">
            <button
              type="submit"
              className="button-link"
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
