import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SellerGuidePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") {
    redirect("/");
  }

  return (
    <main className="page-shell dashboard-page seller-guide-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Seller resources</p>
          <h1>Seller guide</h1>
        </div>
      </header>

      <section className="dashboard-orders seller-guide-subsection" aria-label="Seller flow">
        <div className="seller-guide-section-block">
          <p className="seller-guide-section-flow">
            Sign Up → Connect Stripe → Create Locker → Tag Items → Publish → Get
            Orders → Ship → Get Paid ♡
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-step1">
        <div className="seller-guide-section-block">
          <h2 id="sg-step1" className="seller-guide-section-heading">
            Step 1 — Set Up Payouts
          </h2>
          <p className="seller-guide-section-copy">
            Get paid! Before your first sale connect your Stripe account in the
            dashboard. It takes 2 minutes and makes sure your money gets to you after
            every sale.
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-step2">
        <div className="seller-guide-section-block">
          <h2 id="sg-step2" className="seller-guide-section-heading">
            Step 2 — Photograph Your Locker
          </h2>
          <p className="seller-guide-section-copy">
            Snap a clear photo of your shelf or locker with everything visible. Put a
            numbered tag, sticker, or piece of paper on each item — any number works, it
            just needs to match what you list digitally.
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-step3">
        <div className="seller-guide-section-block">
          <h2 id="sg-step3" className="seller-guide-section-heading">
            Step 3 — List Your Items
          </h2>
          <p className="seller-guide-section-copy">
            Add each item with its matching number and price. Name and description are
            optional but help buyers know what they&apos;re getting! If an item has any
            damage, wear, or missing parts please note it in the description — for
            example &quot;missing batteries&quot; or &quot;does not turn on.&quot;
            Honesty keeps buyers happy and builds your reputation ♡
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-step4">
        <div className="seller-guide-section-block">
          <h2 id="sg-step4" className="seller-guide-section-heading">
            Step 4 — Orders &amp; Shipping
          </h2>
          <p className="seller-guide-section-copy">
            You&apos;ll get an email when someone buys from you with their shipping
            address. Pack it up and ship within 5 business days. Add your tracking
            number in the dashboard so your buyer stays in the loop and you get paid.
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-step5">
        <div className="seller-guide-section-block">
          <h2 id="sg-step5" className="seller-guide-section-heading">
            Step 5 — Getting Paid
          </h2>
          <p className="seller-guide-section-copy">
            Once you&apos;ve added a tracking number Kura Market will send your payout
            to your connected Stripe account. Quick and easy ♡
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-step6">
        <div className="seller-guide-section-block">
          <h2 id="sg-step6" className="seller-guide-section-heading">
            Step 6 — Manage Your Locker
          </h2>
          <p className="seller-guide-section-copy">
            Sold items are automatically locked so no one can buy them twice. Delete
            sold items regularly and update your photo when your inventory changes —
            though it&apos;s not required!
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-shipping">
        <div className="seller-guide-section-block">
          <h2 id="sg-shipping" className="seller-guide-section-heading">
            Shipping &amp; Refunds
          </h2>
          <p className="seller-guide-section-copy">
            Ship within 5 business days and always add a tracking number. If an order
            hasn&apos;t shipped within 7 days the buyer can request a cancellation.
            Questions or issues? We&apos;re always here at{" "}
            <a className="text-link" href="mailto:kuralocker@gmail.com">
              kuralocker@gmail.com
            </a>{" "}
            ♡
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-guidelines">
        <div className="seller-guide-section-block">
          <h2 id="sg-guidelines" className="seller-guide-section-heading">
            Seller Guidelines
          </h2>
          <p className="seller-guide-section-copy">
            Keep it legal and keep it fun! Make sure to follow your local, state, and
            federal laws. No illegal items or anything that violates Stripe&apos;s terms
            of service. Sellers who violate these guidelines will be removed from the
            platform. By selling on Kura Market you agree to our Terms of Service and
            Privacy Policy.
          </p>
        </div>
      </section>

      <section className="dashboard-orders seller-guide-subsection" aria-labelledby="sg-questions">
        <div className="seller-guide-section-block">
          <h2 id="sg-questions" className="seller-guide-section-heading">
            Questions?
          </h2>
          <p className="seller-guide-section-copy">
            Reach out anytime at{" "}
            <a className="text-link" href="mailto:kuralocker@gmail.com">
              kuralocker@gmail.com
            </a>
            . We&apos;ve got you ♡
          </p>
        </div>
      </section>
    </main>
  );
}
