import AddToCartButton from "@/components/AddToCartButton";
import type { CartLockerMeta } from "@/components/CartProvider";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";

type ItemRow = Tables<"items">;

const POLAROID_BG = [
  "#FFB3C6",
  "#B5EAD7",
  "#FFD6A5",
  "#C9B8FF",
  "#AEC6CF",
  "#FFDAC1",
  "#B5D5FF",
  "#F7C5D0",
  "#D4F0A0",
  "#FFF5BA",
] as const;

type Props = {
  params: { id: string };
};

export default async function PublicLockerPage({ params }: Props) {
  const supabase = createClient();
  const { data: locker } = await supabase
    .from("lockers")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!locker || locker.state !== "active") {
    redirect("/");
  }

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("locker_id", locker.id)
    .order("number", { ascending: true });

  const list = (items ?? []) as ItemRow[];

  const cartLocker: CartLockerMeta = {
    id: locker.id,
    number: locker.number,
    nickname: locker.nickname,
    shippingRate: Number(locker.shipping_rate),
  };

  const polaroidIdx = ((locker.number % 10) + 10) % 10;
  const polaroidBg = POLAROID_BG[polaroidIdx];

  return (
    <main
      className="page-shell locker-public"
      style={{ "--locker-polaroid-bg": polaroidBg } as CSSProperties}
    >
      <div className="locker-public-polaroid">
        <div className="locker-public-polaroid-photo">
          {locker.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={locker.photo_url}
              alt=""
              className="locker-public-polaroid-img"
            />
          ) : (
            <div className="locker-public-polaroid-placeholder">No photo</div>
          )}
        </div>
      </div>

      <header className="locker-public-header">
        <p className="locker-public-number mono">#{locker.number}</p>
        <h1>{locker.nickname}</h1>
        <p className="locker-shipping-callout">
          Shipping (flat rate):{" "}
          <strong>${Number(locker.shipping_rate).toFixed(2)}</strong>
        </p>
      </header>

      <section className="locker-items-section" aria-labelledby="items-heading">
        <h2 id="items-heading" className="items-section-title">
          Items
        </h2>
        <ol className="public-item-list price-tag-grid">
          {list.map((item) => (
            <PublicItemRow key={item.id} item={item} locker={cartLocker} />
          ))}
        </ol>
      </section>
    </main>
  );
}

function PublicItemRow({
  item,
  locker,
}: {
  item: ItemRow;
  locker: CartLockerMeta;
}) {
  const name = item.name?.trim() ?? "";
  const desc = item.description?.trim() ?? "";
  const hasMiddle = Boolean(name || desc);
  const nameOnly = Boolean(name && !desc);

  return (
    <li
      className={`price-tag-item${item.sold ? " price-tag-item-sold" : ""}`}
    >
      <div
        className={`price-tag-card${nameOnly ? " price-tag-card--name-only" : ""}`}
      >
        <span className="price-tag-punch" aria-hidden />
        <div className="price-tag-badge">ITEM #{item.number}</div>
        {hasMiddle ? (
          <div className="price-tag-middle">
            {name ? <span className="price-tag-name">{name}</span> : null}
            {desc ? <p className="price-tag-desc">{desc}</p> : null}
          </div>
        ) : null}
        <div className="price-tag-footer">
          <span className="price-tag-price mono">
            ${Number(item.price).toFixed(2)}
          </span>
          {item.sold ? null : (
            <AddToCartButton locker={locker} item={item} />
          )}
        </div>
        {item.sold ? (
          <span className="price-tag-sold-stamp" aria-hidden>
            SOLD
          </span>
        ) : null}
      </div>
    </li>
  );
}
