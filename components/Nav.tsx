import Link from "next/link";
import { redirect } from "next/navigation";
import NavCartLink from "@/components/NavCartLink";
import NavProfileMenu from "@/components/NavProfileMenu";
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

        <div className="nav-end">
          {!user ? (
            <div className="nav-auth">
              <Link href="/login">Log in</Link>
              <Link className="button-link" href="/signup">
                Sign up
              </Link>
            </div>
          ) : (
            <NavProfileMenu
              email={user.email ?? ""}
              role={profile?.role}
              signOutAction={signOut}
            />
          )}
          <NavCartLink />
        </div>
      </nav>
    </header>
  );
}
