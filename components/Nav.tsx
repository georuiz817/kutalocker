import Link from "next/link";
import { redirect } from "next/navigation";
import NavCartLink from "@/components/NavCartLink";
import NavProfileMenu from "@/components/NavProfileMenu";
import NavSellerBell from "@/components/NavSellerBell";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const isSeller = profile?.role === "seller";

  let sellerProcessingOrderCount = 0;
  if (user && isSeller) {
    const admin = createServiceRoleClient();

    const { data: sellerLockers } = await admin
      .from("lockers")
      .select("id")
      .eq("seller_id", user.id);

    const lockerIds = sellerLockers?.map((l) => l.id) ?? [];
    if (lockerIds.length > 0) {
      const { count, error } = await admin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("locker_id", lockerIds)
        .is("tracking_number", null)
        .eq("status", "completed");

      if (error) {
        console.error("[Nav] seller orders count query failed:", error.message);
      } else {
        sellerProcessingOrderCount = count ?? 0;
      }
    }
  }

  async function signOut() {
    "use server";

    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <header className="site-header">
      <nav
        className={`site-nav${!user ? " site-nav--guest" : ""}`}
        aria-label="Main navigation"
      >
        <Link className="home-heading-title" href="/">
          {"Kura Mart"}
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, dimensions set in CSS */}
          <img className="home-heading-sticker" src="/HomeHeadingSticker.jpg" alt="" />
        </Link>

        <div className="nav-end">
          {!user ? (
            <div className="nav-auth">
              <Link className="button-link" href="/login">
                Log in
              </Link>
              <Link className="button-link" href="/signup">
                Sign up
              </Link>
            </div>
          ) : (
            <>
              {isSeller ? (
                <NavSellerBell processingOrderCount={sellerProcessingOrderCount} />
              ) : null}
              <NavProfileMenu
                email={user.email ?? ""}
                role={profile?.role}
                signOutAction={signOut}
              />
            </>
          )}
          {!user || !isSeller ? <NavCartLink /> : null}
        </div>
      </nav>
    </header>
  );
}
