import Link from "next/link";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

type LockerRow = Tables<"lockers">;

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

export default async function HomePage() {
  const supabase = createClient();
  const { data: lockers } = await supabase
    .from("lockers")
    .select("*")
    .eq("state", "active")
    .order("number", { ascending: true });

  const list = lockers ?? [];

  return (
    <main className="page-shell home-page">
      {list.length === 0 ? (
        <p className="muted">No active lockers yet. Check back soon.</p>
      ) : (
        <ul className="locker-grid">
          {list.map((locker) => (
            <li key={locker.id}>
              <LockerCard locker={locker} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function LockerCard({ locker }: { locker: LockerRow }) {
  const idx = ((locker.number % 10) + 10) % 10;
  const bg = POLAROID_BG[idx];
  const nickname = locker.nickname?.trim();

  return (
    <Link
      className="locker-card"
      href={`/lockers/${locker.id}`}
      style={{ "--locker-polaroid-bg": bg } as CSSProperties}
    >
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
        <span className="locker-card-label-pill">
          #{locker.number}
          {nickname ? ` ${nickname}` : ""}
        </span>
      </div>
    </Link>
  );
}
