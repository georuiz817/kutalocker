import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell not-found-page">
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
      <img
        className="not-found-illustration"
        src="/404Bot.png"
        alt=""
        width={280}
        height={280}
      />
      <h1>Page not found</h1>
      <p className="muted not-found-lead">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link className="text-link not-found-home" href="/">
        Back to home
      </Link>
    </main>
  );
}
