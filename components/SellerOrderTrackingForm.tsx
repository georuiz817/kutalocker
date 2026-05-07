"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { updateOrderTrackingAction } from "@/app/dashboard/actions";
import { ORDER_CARRIER_OPTIONS } from "@/lib/tracking";

type Props = {
  orderId: string;
  initialTracking: string | null;
  initialCarrier: string | null;
};

export default function SellerOrderTrackingForm({
  orderId,
  initialTracking,
  initialCarrier,
}: Props) {
  const router = useRouter();
  const hasTracking =
    Boolean(initialTracking?.trim()) && Boolean(initialCarrier);

  const [showNewForm, setShowNewForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const [state, formAction] = useFormState(updateOrderTrackingAction, null);

  useEffect(() => {
    if (state?.ok) {
      setEditing(false);
      setShowNewForm(false);
      router.refresh();
    }
  }, [state, router]);

  const carrierDefault =
    initialCarrier &&
    ORDER_CARRIER_OPTIONS.includes(
      initialCarrier as (typeof ORDER_CARRIER_OPTIONS)[number],
    )
      ? initialCarrier
      : "USPS";

  return (
    <div className="seller-order-tracking">
      {!hasTracking && !showNewForm ? (
        <button
          type="button"
          className="button-ghost seller-order-tracking-add-btn"
          onClick={() => setShowNewForm(true)}
        >
          Add Tracking
        </button>
      ) : null}

      {hasTracking && !editing ? (
        <div className="seller-order-tracking-display">
          <p className="seller-order-tracking-line">
            <span className="muted">Tracking:</span> {initialCarrier}{" "}
            <span className="mono">{initialTracking}</span>
          </p>
          <button
            type="button"
            className="button-ghost seller-order-tracking-edit-btn"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
      ) : null}

      {(!hasTracking && showNewForm) || (hasTracking && editing) ? (
        <form className="seller-order-tracking-form" action={formAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <label
            className="seller-order-tracking-label"
            htmlFor={`track-${orderId}`}
          >
            Tracking number
          </label>
          <input
            id={`track-${orderId}`}
            name="trackingNumber"
            type="text"
            className="seller-order-tracking-input"
            defaultValue={initialTracking ?? ""}
            required
            autoComplete="off"
          />

          <label
            className="seller-order-tracking-label"
            htmlFor={`carrier-${orderId}`}
          >
            Carrier
          </label>
          <select
            id={`carrier-${orderId}`}
            name="carrier"
            className="seller-order-tracking-select"
            required
            defaultValue={carrierDefault}
          >
            {ORDER_CARRIER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="seller-order-tracking-actions">
            <button type="submit" className="button-link seller-order-tracking-save">
              Save
            </button>
            {(hasTracking && editing) || (!hasTracking && showNewForm) ? (
              <button
                type="button"
                className="button-ghost seller-order-tracking-cancel"
                onClick={() => {
                  setEditing(false);
                  setShowNewForm(false);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          {state?.ok === false ? (
            <p className="seller-order-tracking-error" role="alert">
              {state.error}
            </p>
          ) : null}

          {state?.ok === true ? (
            <p className="seller-order-tracking-success" role="status">
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
