"use client";

import { freezeLockerFromEditPage } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { LOCKER_PHOTOS_BUCKET } from "@/lib/storage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type LockerRow = Tables<"lockers">;
type ItemRow = Tables<"items">;

type ItemFormRow = {
  key: string;
  id?: string;
  number: string;
  price: string;
  name: string;
  description: string;
};

function emptyItemRow(): ItemFormRow {
  return {
    key: crypto.randomUUID(),
    number: "",
    price: "",
    name: "",
    description: "",
  };
}

type LockerFormProps = {
  mode: "new" | "edit";
  initialLocker?: LockerRow;
  initialItems?: ItemRow[];
  /** Set when redirecting from create with `?saved=1` */
  savedFromCreate?: boolean;
};

export default function LockerForm({
  mode,
  initialLocker,
  initialItems = [],
  savedFromCreate = false,
}: LockerFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const readOnly = mode === "edit" && initialLocker?.state === "frozen";
  const lockerId = initialLocker?.id;

  const [nickname, setNickname] = useState(initialLocker?.nickname ?? "");
  const [shippingRate, setShippingRate] = useState(
    initialLocker != null ? String(initialLocker.shipping_rate) : ""
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialLocker?.photo_url ?? null
  );
  const [rows, setRows] = useState<ItemFormRow[]>(() =>
    initialItems.length
      ? initialItems.map((item) => ({
          key: item.id,
          id: item.id,
          number: String(item.number),
          price: String(item.price),
          name: item.name ?? "",
          description: item.description ?? "",
        }))
      : [emptyItemRow()]
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const serverItemsKey =
    mode === "edit"
      ? initialItems.map((i) => i.id).sort().join(",")
      : "";

  useEffect(() => {
    if (mode !== "edit" || !initialLocker) {
      return;
    }
    setNickname(initialLocker.nickname);
    setShippingRate(String(initialLocker.shipping_rate));
    setPhotoPreview(initialLocker.photo_url);
    setPhotoFile(null);
    setRows(
      initialItems.length
        ? initialItems.map((item) => ({
            key: item.id,
            id: item.id,
            number: String(item.number),
            price: String(item.price),
            name: item.name ?? "",
            description: item.description ?? "",
          }))
        : [emptyItemRow()]
    );
    setRemovedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit initialLocker / initialItems to avoid resetting on unrelated RSC re-renders
  }, [mode, initialLocker?.id, serverItemsKey]);

  useEffect(() => {
    if (!savedFromCreate || mode !== "edit" || !lockerId) {
      return;
    }
    setSaveNotice("Locker saved");
    setError("");
    router.replace(`/dashboard/lockers/${lockerId}`, { scroll: false });
  }, [savedFromCreate, mode, lockerId, router]);

  useEffect(() => {
    if (!saveNotice) {
      return;
    }
    const timer = window.setTimeout(() => setSaveNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  function addRow() {
    setRows((r) => [...r, emptyItemRow()]);
  }

  function removeRow(key: string) {
    const row = rows.find((x) => x.key === key);
    if (row?.id) {
      setRemovedIds((ids) => [...ids, row.id!]);
    }
    setRows((r) => {
      const next = r.filter((x) => x.key !== key);
      return next.length ? next : [emptyItemRow()];
    });
  }

  function updateRow(
    key: string,
    field: "number" | "price" | "name" | "description",
    value: string
  ) {
    setRows((r) =>
      r.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }

  async function uploadPhoto(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upError } = await supabase.storage
      .from(LOCKER_PHOTOS_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upError) {
      const msg = (upError.message ?? "").toLowerCase();
      if (
        msg.includes("bucket not found") ||
        msg.includes("not found") && msg.includes("bucket")
      ) {
        throw new Error(
          `Storage bucket "${LOCKER_PHOTOS_BUCKET}" does not exist yet. In the Supabase dashboard go to Storage → New bucket, set the name to ${LOCKER_PHOTOS_BUCKET}, turn on Public bucket, then create it. Or run the SQL file supabase/migrations/20260426100000_ensure_locker_photos_bucket.sql in the SQL Editor.`
        );
      }
      throw upError;
    }
    const { data } = supabase.storage
      .from(LOCKER_PHOTOS_BUCKET)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) {
      return;
    }
    if (submitting) {
      return;
    }
    setError("");
    setSaveNotice("");
    setSubmitting(true);

    let didNavigateToNewLocker = false;

    function scheduleReEnableSave() {
      requestAnimationFrame(() => {
        setSubmitting(false);
      });
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        return;
      }

      const parsedRows = rows
        .map((row) => ({
          ...row,
          num: row.number.trim() === "" ? null : Number.parseInt(row.number, 10),
          pr: row.price.trim() === "" ? null : Number.parseFloat(row.price),
        }))
        .filter((row) => {
          const empty =
            row.number.trim() === "" &&
            row.price.trim() === "" &&
            row.name.trim() === "" &&
            row.description.trim() === "";
          return !empty;
        });

      for (const row of parsedRows) {
        if (row.num === null || Number.isNaN(row.num)) {
          setError("Each item row needs a valid number.");
          return;
        }
        if (row.pr === null || Number.isNaN(row.pr) || row.pr < 0) {
          setError("Each item row needs a valid price (0 or greater).");
          return;
        }
      }

      const nums = parsedRows.map((r) => r.num!);
      if (new Set(nums).size !== nums.length) {
        setError("Item numbers must be unique within this locker.");
        return;
      }

      const ship = Number.parseFloat(shippingRate);
      if (Number.isNaN(ship) || ship < 0) {
        setError("Shipping rate must be a number (0 or greater).");
        return;
      }

      if (!nickname.trim()) {
        setError("Nickname is required.");
        return;
      }

      let photoUrl: string | null = initialLocker?.photo_url ?? null;
      if (photoFile) {
        photoUrl = await uploadPhoto(user.id, photoFile);
      }

      if (mode === "new") {
        const { data: locker, error: lockerError } = await supabase
          .from("lockers")
          .insert({
            nickname: nickname.trim(),
            shipping_rate: ship,
            photo_url: photoUrl,
            seller_id: user.id,
          })
          .select("id")
          .single();

        if (lockerError || !locker) {
          setError(lockerError?.message ?? "Could not create locker.");
          return;
        }

        if (parsedRows.length) {
          const { error: itemsError } = await supabase.from("items").insert(
            parsedRows.map((row) => ({
              locker_id: locker.id,
              number: row.num!,
              price: row.pr!,
              name: row.name.trim() ? row.name.trim() : null,
              description: row.description.trim()
                ? row.description.trim()
                : null,
            }))
          );
          if (itemsError) {
            setError(itemsError.message);
            return;
          }
        }

        didNavigateToNewLocker = true;
        router.push(`/dashboard/lockers/${locker.id}?saved=1`);
        router.refresh();
        return;
      }

      if (!initialLocker) {
        setError("Missing locker.");
        return;
      }

      const { error: updateLockerError } = await supabase
        .from("lockers")
        .update({
          nickname: nickname.trim(),
          shipping_rate: ship,
          photo_url: photoUrl,
        })
        .eq("id", initialLocker.id)
        .eq("seller_id", user.id);

      if (updateLockerError) {
        setError(updateLockerError.message);
        return;
      }

      if (removedIds.length) {
        const { error: delError } = await supabase
          .from("items")
          .delete()
          .in("id", removedIds);
        if (delError) {
          setError(delError.message);
          return;
        }
      }

      for (const row of parsedRows) {
        if (row.id) {
          const { error: upError } = await supabase
            .from("items")
            .update({
              number: row.num!,
              price: row.pr!,
              name: row.name.trim() ? row.name.trim() : null,
              description: row.description.trim()
                ? row.description.trim()
                : null,
            })
            .eq("id", row.id)
            .eq("locker_id", initialLocker.id);
          if (upError) {
            setError(upError.message);
            return;
          }
        } else {
          const { error: insError } = await supabase.from("items").insert({
            locker_id: initialLocker.id,
            number: row.num!,
            price: row.pr!,
            name: row.name.trim() ? row.name.trim() : null,
            description: row.description.trim()
              ? row.description.trim()
              : null,
          });
          if (insError) {
            setError(insError.message);
            return;
          }
        }
      }

      setSaveNotice("Locker saved");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (!didNavigateToNewLocker) {
        scheduleReEnableSave();
      }
    }
  }

  return (
    <main className="page-shell locker-form-page">
      <div className="locker-form-header">
        <Link className="text-link" href="/dashboard">
          ← Back to dashboard
        </Link>
        {mode === "edit" && initialLocker ? (
          <p className="locker-number-pill mono">Locker #{initialLocker.number}</p>
        ) : null}
      </div>

      {readOnly ? (
        <div className="banner banner-frozen" role="status">
          This locker is frozen and can no longer be edited.
        </div>
      ) : null}

      {saveNotice ? (
        <div className="banner banner-success" role="status">
          {saveNotice}
        </div>
      ) : null}

      <section className="panel locker-form-panel">
        <h1 className="locker-form-title">
          {mode === "new" ? "Create locker" : "Edit locker"}
        </h1>

        <form className="locker-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="nickname">Nickname</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={readOnly}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="shipping_rate">Shipping rate</label>
            <input
              id="shipping_rate"
              name="shipping_rate"
              type="number"
              min={0}
              step="0.01"
              value={shippingRate}
              onChange={(e) => setShippingRate(e.target.value)}
              disabled={readOnly}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="photo">Photo</label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={readOnly}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPhotoFile(file);
                if (file) {
                  setPhotoPreview(URL.createObjectURL(file));
                } else {
                  setPhotoPreview(initialLocker?.photo_url ?? null);
                }
              }}
            />
            {photoPreview ? (
              <div className="photo-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview uses blob: and external URLs; next/image needs host config */}
                <img src={photoPreview} alt="" />
              </div>
            ) : null}
          </div>

          <fieldset className="items-fieldset" disabled={readOnly}>
            <legend>Items</legend>
            <p className="muted small items-hint">
              Number and price are required for each row you keep. Name and
              description are optional.
            </p>
            <div className="item-rows">
              {rows.map((row) => (
                <div className="item-row" key={row.key}>
                  <div className="field compact">
                    <label htmlFor={`num-${row.key}`}>Number</label>
                    <input
                      id={`num-${row.key}`}
                      type="number"
                      step={1}
                      value={row.number}
                      onChange={(e) =>
                        updateRow(row.key, "number", e.target.value)
                      }
                    />
                  </div>
                  <div className="field compact">
                    <label htmlFor={`price-${row.key}`}>Price</label>
                    <input
                      id={`price-${row.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.price}
                      onChange={(e) =>
                        updateRow(row.key, "price", e.target.value)
                      }
                    />
                  </div>
                  <div className="field compact grow">
                    <label htmlFor={`name-${row.key}`}>Name (optional)</label>
                    <input
                      id={`name-${row.key}`}
                      type="text"
                      value={row.name}
                      onChange={(e) =>
                        updateRow(row.key, "name", e.target.value)
                      }
                    />
                  </div>
                  <div className="field compact grow wide">
                    <label htmlFor={`desc-${row.key}`}>
                      Description (optional)
                    </label>
                    <input
                      id={`desc-${row.key}`}
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        updateRow(row.key, "description", e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="button-ghost row-remove"
                    onClick={() => removeRow(row.key)}
                    disabled={readOnly}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="button-ghost add-item-btn"
              onClick={addRow}
              disabled={readOnly}
            >
              Add item
            </button>
          </fieldset>

          {error ? <p className="form-message">{error}</p> : null}

          <div className="form-actions">
            <button
              className="button-link"
              type="submit"
              disabled={readOnly || submitting}
            >
              {submitting ? "Saving…" : "Save locker"}
            </button>
          </div>
        </form>

        {mode === "edit" && initialLocker && initialLocker.state === "active" ? (
          <form action={freezeLockerFromEditPage} className="freeze-block">
            <input type="hidden" name="lockerId" value={initialLocker.id} />
            <p className="muted small">
              Freezing locks the listing. You will not be able to edit this
              locker afterward.
            </p>
            <button type="submit" className="button-danger">
              Freeze locker
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
