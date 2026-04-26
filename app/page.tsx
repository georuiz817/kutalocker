import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

type LockerRow = Tables<"lockers">;

function countAvailableByLocker(
  items: { locker_id: string; sold: boolean }[] | null
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of items ?? []) {
    if (!row.sold) {
      map.set(row.locker_id, (map.get(row.locker_id) ?? 0) + 1);
    }
  }
  return map;
}

export default async function HomePage() {
  const supabase = createClient();
  const { data: lockers } = await supabase
    .from("lockers")
    .select("*")
    .eq("state", "active")
    .order("number", { ascending: true });

  const list = lockers ?? [];
  const ids = list.map((l) => l.id);
  const { data: itemRows } =
    ids.length > 0
      ? await supabase
          .from("items")
          .select("locker_id, sold")
          .in("locker_id", ids)
      : { data: [] as { locker_id: string; sold: boolean }[] };

  const availableMap = countAvailableByLocker(itemRows);

  return (
    <main className="page-shell home-page">
      <header className="home-header">
        <p className="eyebrow">Marketplace</p>
        <h1>Active lockers</h1>
        <p className="muted">
          Browse seller lockers. Add items to your cart as a buyer.
        </p>
      </header>

      {list.length === 0 ? (
        <p className="muted">No active lockers yet. Check back soon.</p>
      ) : (
        <ul className="locker-grid">
          {list.map((locker) => (
            <li key={locker.id}>
              <LockerCard locker={locker} available={availableMap.get(locker.id) ?? 0} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function LockerCard({ locker, available }: { locker: LockerRow; available: number }) {
  return (
    <Link className="locker-card" href={`/lockers/${locker.id}`}>
      <div className="locker-card-image-wrap">
        {locker.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase URLs
          <img
            className="locker-card-image"
            src={locker.photo_url}
            alt=""
          />
        ) : (
          <div className="locker-card-placeholder" aria-hidden="true">
            No photo
          </div>
        )}
      </div>
      <div className="locker-card-body">
        <p className="locker-card-number mono">#{locker.number}</p>
        <h2 className="locker-card-title">{locker.nickname}</h2>
        <p className="locker-card-meta">
          Shipping: ${Number(locker.shipping_rate).toFixed(2)}
        </p>
        <p className="locker-card-meta">
          {available} item{available === 1 ? "" : "s"} available
        </p>
      </div>
    </Link>
  );
}
