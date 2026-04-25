import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { freezeLockerFromList } from "./actions";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: lockers } = await supabase
    .from("lockers")
    .select("*")
    .eq("seller_id", user.id)
    .order("number", { ascending: true });

  return (
    <main className="page-shell dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Seller dashboard</p>
          <h1>Your lockers</h1>
          <p className="muted">
            Create a locker, add items, and freeze it when you are done listing.
          </p>
        </div>
        <Link className="button-link" href="/dashboard/lockers/new">
          Create locker
        </Link>
      </header>

      {!lockers?.length ? (
        <section className="panel empty-state">
          <p className="muted">You do not have any lockers yet.</p>
          <Link className="button-link" href="/dashboard/lockers/new">
            Create your first locker
          </Link>
        </section>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Number</th>
                <th scope="col">Nickname</th>
                <th scope="col">State</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lockers.map((locker) => (
                <tr key={locker.id}>
                  <td className="mono">{locker.number}</td>
                  <td>{locker.nickname}</td>
                  <td>
                    <span
                      className={`state-badge state-${locker.state.replace(/_/g, "-")}`}
                    >
                      {locker.state.replace("_", " ")}
                    </span>
                  </td>
                  <td className="row-actions">
                    <Link
                      className="button-ghost"
                      href={`/dashboard/lockers/${locker.id}`}
                    >
                      Edit
                    </Link>
                    {locker.state === "active" ? (
                      <form action={freezeLockerFromList}>
                        <input
                          type="hidden"
                          name="lockerId"
                          value={locker.id}
                        />
                        <button className="button-ghost" type="submit">
                          Freeze
                        </button>
                      </form>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
