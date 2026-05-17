import { unstable_noStore as noStore } from "next/cache";
import { Fragment } from "react";
import type { CSSProperties } from "react";

const MARQUEE_BASE =
  "Welcome to the opening of Kura Market. Shop, sell, and explore what people have to offer. Kura Mart is looking for sellers to grow the site!!!! First 100 lockers will get a special OG badge.";

function splitMarqueeSentences(base: string): string[] {
  return base
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const MARQUEE_SENTENCES = splitMarqueeSentences(MARQUEE_BASE);

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

/** Pixel sprites between phrase repeats; indexes rotate across gaps and slots. */
const MARQUEE_PIXEL_DECOR_SRC = [
  "/pixelCharacters/catChain.png",
  "/pixelCharacters/chineseCat.png",
  "/pixelCharacters/pinkFairy.png",
  "/pixelCharacters/purpleHairDoll.png",
  "/pixelCharacters/robotToy.png",
  "/pixelCharacters/teddyBear.png",
  "/pixelCharacters/tomagachi.png",
  "/pixelCharacters/videoGameBunny.png",
  "/pixelCharacters/waterGun.png",
] as const;

const MARQUEE_DECOR_IMAGES_PER_GAP = 8;

const MARQUEE_REPEATS = 4;

function MarqueeSegment({ segmentKey }: { segmentKey: "a" | "b" }) {
  return (
    <span className="marquee-segment">
      {Array.from({ length: MARQUEE_REPEATS }, (_, r) =>
        MARQUEE_SENTENCES.flatMap((sentence, s) => {
          const isLastOverall =
            r === MARQUEE_REPEATS - 1 &&
            s === MARQUEE_SENTENCES.length - 1;

          const phrase = (
            <span key={`p-${segmentKey}-${r}-${s}`} className="marquee-phrase">
              <span className="marquee-phrase-text">{sentence}</span>
            </span>
          );

          if (isLastOverall) return [phrase];

          const gc = r * MARQUEE_SENTENCES.length + s;
          const divider = (
            <span
              key={`d-${segmentKey}-${r}-${s}`}
              className="marquee-decor marquee-decor-cluster"
              aria-hidden="true"
            >
              {Array.from({ length: MARQUEE_DECOR_IMAGES_PER_GAP }, (_, k) => {
                const srcIndex =
                  (gc * MARQUEE_DECOR_IMAGES_PER_GAP + k) %
                  MARQUEE_PIXEL_DECOR_SRC.length;
                return (
                  /* eslint-disable-next-line @next/next/no-img-element -- small static pixel sprites */
                  <img
                    key={`m-${segmentKey}-${r}-${s}-${k}`}
                    className="marquee-decor-img"
                    src={MARQUEE_PIXEL_DECOR_SRC[srcIndex]}
                    alt=""
                    decoding="async"
                  />
                );
              })}
            </span>
          );

          return [phrase, divider];
        })
      ).flat()}
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
      <p className="marquee-fallback">
        {MARQUEE_SENTENCES.map((sentence, i) => (
          <Fragment key={`fb-${i}`}>
            <span className="marquee-fallback-sentence">{sentence}</span>
            {i < MARQUEE_SENTENCES.length - 1 ? " " : null}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
