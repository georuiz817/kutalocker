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
    <main className="page-shell locker-public">
      <div
        className="locker-public-polaroid"
        style={{ "--locker-polaroid-bg": polaroidBg } as CSSProperties}
      >
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
        <ol className="public-item-list">
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
  return (
    <li
      className={`public-item${item.sold ? " public-item-sold" : ""}`}
      data-item-number={item.number}
    >
      <div className="public-item-main">
        <span className="public-item-index mono">{item.number}.</span>
        <div className="public-item-body">
          <div className="public-item-title-row">
            <span className="public-item-name">
              {item.name?.trim() ? item.name : `Item ${item.number}`}
            </span>
            <span className="public-item-price mono">
              ${Number(item.price).toFixed(2)}
            </span>
          </div>
          {item.description?.trim() ? (
            <p className="public-item-desc muted">{item.description}</p>
          ) : null}
          {item.sold ? (
            <span className="sold-badge" aria-label="Sold">
              Sold
            </span>
          ) : (
            <AddToCartButton locker={locker} item={item} />
          )}
        </div>
      </div>
    </li>
  );
}
