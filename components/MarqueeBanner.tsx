import { unstable_noStore as noStore } from "next/cache";
import { Fragment } from "react";
import type { CSSProperties } from "react";

const MARQUEE_BASE =
  "Welcome to the opening of Kura Market. Shop, sell, and explore what people have to offer.";

/** Same palette as homepage locker polaroids (CSS --locker-color-*). */
const MARQUEE_PALETTE = [
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

const MARQUEE_DECOR_CLUSTER = "✦ ♡ ✿";

function withSentenceSparkles(text: string): string {
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `${s}✨`)
    .join(" ");
}

const MARQUEE_TEXT = withSentenceSparkles(MARQUEE_BASE);

const MARQUEE_REPEATS = 4;

function MarqueeSegment({ segmentKey }: { segmentKey: "a" | "b" }) {
  return (
    <span className="marquee-segment">
      {Array.from({ length: MARQUEE_REPEATS }, (_, i) => (
        <Fragment key={`m-${segmentKey}-${i}`}>
          <span className="marquee-phrase">{MARQUEE_TEXT}</span>
          {i < MARQUEE_REPEATS - 1 ? (
            <span className="marquee-decor" aria-hidden="true">
              {MARQUEE_DECOR_CLUSTER}
            </span>
          ) : null}
        </Fragment>
      ))}
    </span>
  );
}

export default function MarqueeBanner() {
  noStore();
  const marqueeBg =
    MARQUEE_PALETTE[Math.floor(Math.random() * MARQUEE_PALETTE.length)];

  return (
    <div
      className="marquee-banner"
      role="region"
      aria-label={MARQUEE_BASE}
      style={
        {
          "--marquee-bg": marqueeBg,
        } as CSSProperties
      }
    >
      <div className="marquee-animated" aria-hidden="true">
        <div className="marquee-track">
          <MarqueeSegment segmentKey="a" />
          <MarqueeSegment segmentKey="b" />
        </div>
      </div>
      <p className="marquee-fallback">{MARQUEE_TEXT}</p>
    </div>
  );
}
