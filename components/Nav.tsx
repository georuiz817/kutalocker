import Link from "next/link";
import { redirect } from "next/navigation";
import NavCartLink from "@/components/NavCartLink";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  async function signOut() {
    "use server";

    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            K
          </span>
          <span>Kura</span>
        </Link>

        <div className="nav-links">
          <NavCartLink />
          {user ? (
            <>
              {profile?.role === "buyer" ? (
                <Link href="/orders">Orders</Link>
              ) : null}
              {profile?.role === "seller" ? (
                <Link href="/dashboard">Dashboard</Link>
              ) : null}
              <span className="user-email">{user.email}</span>
              <form action={signOut}>
                <button className="link-button" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link className="button-link" href="/signup">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
