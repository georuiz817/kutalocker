/** Matches the marketplace locker pastel set (`--locker-color-1` … `--locker-color-10` in globals.css). */
export const LOCKER_PALETTE_HEX = [
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

export function pickRandomLockerPaletteHex(): string {
  const idx = Math.floor(Math.random() * LOCKER_PALETTE_HEX.length);
  return LOCKER_PALETTE_HEX[idx]!;
}
