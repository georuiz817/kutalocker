import fs from "fs/promises";
import path from "path";

/** Folder names in order of item.number % 10 (matches ITEM_TAG_PALETTE). */
export const ITEM_STICKER_FOLDERS = [
  "mint",
  "lavender",
  "pink",
  "yellow",
  "dusty-blue",
  "peach",
  "sky-blue",
  "blush-pink",
  "lime",
  "warm-orange",
] as const;

export type ItemStickerFolder = (typeof ITEM_STICKER_FOLDERS)[number];

export type ItemStickerDecor = {
  urls: string[];
  widths: string[];
  rotations: number[];
};

const poolsCache = new Map<string, string[]>();
const imgRe = /\.(png|jpe?g|webp|gif|svg)$/i;

export async function loadStickerPool(
  folder: ItemStickerFolder,
): Promise<string[]> {
  const hit = poolsCache.get(folder);
  if (hit) return hit;
  const dir = path.join(process.cwd(), "public", "stickers", folder);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const urls = entries
      .filter(
        (e) =>
          e.isFile() &&
          !e.name.startsWith(".") &&
          imgRe.test(e.name),
      )
      .map((e) => `/stickers/${folder}/${e.name}`)
      .sort();
    poolsCache.set(folder, urls);
    return urls;
  } catch {
    poolsCache.set(folder, []);
    return [];
  }
}

export async function loadAllStickerPools(): Promise<
  Record<ItemStickerFolder, string[]>
> {
  const entries = await Promise.all(
    ITEM_STICKER_FOLDERS.map(async (f) => {
      const urls = await loadStickerPool(f);
      return [f, urls] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<ItemStickerFolder, string[]>;
}

function hashToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic order — same item → same permutation every load */
function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 13), 1664525) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WIDTH_CHOICES = ["26px", "28px", "30px", "32px", "34px"] as const;

const ROT_CHOICES = [-11, -6, 0, 4, 8, -14, 11, -3] as const;

export function pickItemStickerDecor(
  pool: string[],
  itemId: string,
): ItemStickerDecor {
  const empty: ItemStickerDecor = {
    urls: [],
    widths: [],
    rotations: [],
  };
  if (!pool?.length) {
    return empty;
  }

  const seed = hashToSeed(itemId);
  const pickCount =
    pool.length >= 2 && ((seed >>> 25) & 1) === 1 ? 2 : 1;
  const picked = shuffleDeterministic(pool, seed ^ 270920079).slice(
    0,
    pickCount,
  );

  const rot0 =
    ROT_CHOICES[(seed >>> 3) % ROT_CHOICES.length];
  let rot1 = ROT_CHOICES[((seed >>> 9) + 3) % ROT_CHOICES.length];
  if (picked.length >= 2 && rot1 === rot0) {
    rot1 =
      ROT_CHOICES[
        ((seed >>> 15) + 1) %
          ROT_CHOICES.length
      ];
  }

  const w0 =
    WIDTH_CHOICES[(seed >>> 5) % WIDTH_CHOICES.length];
  const w1 =
    WIDTH_CHOICES[((seed >>> 17) + 2) % WIDTH_CHOICES.length];

  const widths =
    picked.length >= 2
      ? [w0, w1]
      : [w0];
  const rotations = picked.length >= 2 ? [rot0, rot1] : [rot0];

  return {
    urls: picked,
    widths,
    rotations,
  };
}
