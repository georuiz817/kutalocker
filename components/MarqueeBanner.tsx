const MARQUEE_TEXT =
  "Welcome to the opening of Kura Market. Shop, sell, and explore what people have to offer.";

const MARQUEE_REPEATS = 4;

export default function MarqueeBanner() {
  return (
    <div
      className="marquee-banner"
      role="region"
      aria-label={MARQUEE_TEXT}
    >
      <div className="marquee-animated" aria-hidden="true">
        <div className="marquee-track">
          <span className="marquee-segment">
            {Array.from({ length: MARQUEE_REPEATS }, (_, i) => (
              <span key={`m-a-${i}`} className="marquee-phrase">
                {MARQUEE_TEXT}
              </span>
            ))}
          </span>
          <span className="marquee-segment">
            {Array.from({ length: MARQUEE_REPEATS }, (_, i) => (
              <span key={`m-b-${i}`} className="marquee-phrase">
                {MARQUEE_TEXT}
              </span>
            ))}
          </span>
        </div>
      </div>
      <p className="marquee-fallback">{MARQUEE_TEXT}</p>
    </div>
  );
}
