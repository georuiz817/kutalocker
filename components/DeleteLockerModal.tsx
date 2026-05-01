"use client";

import {
  deleteLockerAction,
  type DeleteLockerState,
} from "@/app/dashboard/actions";
import { useCallback, useEffect, useState } from "react";
import { useFormState } from "react-dom";

const initialDeleteState: DeleteLockerState = { error: null };

function DeleteLockerModalInner({
  lockerId,
  onClose,
}: {
  lockerId: string;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(
    deleteLockerAction,
    initialDeleteState
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-locker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-locker-title" className="modal-title">
          Delete Locker
        </h2>
        <p className="modal-body muted">
          Are you sure you want to delete this locker? This cannot be undone.
        </p>
        <form action={formAction} className="modal-form">
          <input type="hidden" name="lockerId" value={lockerId} />
          {state?.error ? (
            <p className="form-message" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="modal-actions">
            <button
              type="button"
              className="button-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="button-danger">
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteLockerModal({
  isOpen,
  onClose,
  lockerId,
}: {
  isOpen: boolean;
  onClose: () => void;
  lockerId: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <DeleteLockerModalInner lockerId={lockerId} onClose={onClose} />
  );
}

export function DeleteLockerButton({ lockerId }: { lockerId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className="button-ghost"
        onClick={() => setOpen(true)}
      >
        Delete
      </button>
      <DeleteLockerModal isOpen={open} onClose={close} lockerId={lockerId} />
    </>
  );
}
