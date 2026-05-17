"use client";

import { useCallback, useEffect, useId, useState } from "react";

type Props = {
  photoUrl: string;
};

export default function LockerPolaroidLightbox({ photoUrl }: Props) {
  const [open, setOpen] = useState(false);
  const dialogLabelId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className="locker-polaroid-open-lightbox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${dialogLabelId}-dialog` : undefined}
        aria-label="View full-size locker photo"
        onClick={() => setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase/storage URL */}
        <img
          src={photoUrl}
          alt=""
          className="locker-public-polaroid-img locker-public-polaroid-img--clickable"
        />
        <span className="locker-polaroid-expand-hint" aria-hidden>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="locker-polaroid-expand-svg"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </span>
      </button>
      {open ? (
        <div
          id={`${dialogLabelId}-dialog`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogLabelId}
          className="locker-photo-lightbox"
          onClick={close}
        >
          <p id={dialogLabelId} className="locker-photo-lightbox__sr-only">
            Full size locker photo
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt=""
            className="locker-photo-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
