import OrderConfirmedClient from "./OrderConfirmedClient";

type Props = {
  searchParams: { session_id?: string };
};

export default function OrderConfirmedPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;
  if (!sessionId) {
    return (
      <main className="page-shell order-confirmed">
        <p className="muted">Missing checkout session. Return to your cart to try again.</p>
      </main>
    );
  }

  return <OrderConfirmedClient sessionId={sessionId} />;
}
