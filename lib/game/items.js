// Static crazy-item catalogue for F1 Crazy.
// Kept consistent with the `items` seed rows in schema.sql and server/db/seed.js.

export const ITEMS = [
  {
    slug: 'banana',
    name: 'Banana',
    points: 25,
    rarity: 'common',
    spawnWeight: 34,
    description: 'The classic Monaco street snack. Slippery, cheerful and worth a tidy 25 points.',
    isHazard: false,
  },
  {
    slug: 'pineapple',
    name: 'Pineapple',
    points: 50,
    rarity: 'common',
    spawnWeight: 24,
    description: 'Spiky, tropical and completely out of place on a Formula One circuit. Perfect.',
    isHazard: false,
  },
  {
    slug: 'rubber-duck',
    name: 'Rubber Duck',
    points: 40,
    rarity: 'common',
    spawnWeight: 18,
    description: 'Escaped from the harbour yachts. Squeaks loudly when collected at speed.',
    isHazard: false,
  },
  {
    slug: 'traffic-cone',
    name: 'Traffic Cone',
    points: -15,
    rarity: 'common',
    spawnWeight: 12,
    description: 'Left behind by the barrier crew. Clipping one costs you 15 points and some pride.',
    isHazard: true,
  },
  {
    slug: 'flying-baguette',
    name: 'Flying Baguette',
    points: 75,
    rarity: 'rare',
    spawnWeight: 8,
    description: 'Launched from a café balcony above Casino Square. Crusty, aerodynamic, valuable.',
    isHazard: false,
  },
  {
    slug: 'golden-pineapple',
    name: 'Golden Pineapple',
    points: 250,
    rarity: 'legendary',
    spawnWeight: 2,
    description: 'The ultimate trophy of the Monaco street scramble. Rare, shiny and worth 250 points.',
    isHazard: false,
  },
  {
    slug: 'mystery-crate',
    name: 'Mystery Crate',
    points: 100,
    rarity: 'rare',
    spawnWeight: 6,
    description: 'Nobody knows what is inside. Scores anywhere between 10 and 300 points.',
    isHazard: false,
    randomRange: { min: 10, max: 300 },
  },
];

export const ITEM_SLUGS = ITEMS.map((item) => item.slug);

const ITEM_MAP = ITEMS.reduce((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {});

export const FALLBACK_ITEM = ITEMS[0];

/**
 * Look up an item definition by slug.
 * @param {string} slug
 * @returns {object|null}
 */
export function getItemBySlug(slug) {
  if (typeof slug !== 'string' || slug.length === 0) return null;
  return ITEM_MAP[slug] || null;
}

/**
 * Resolve the point value for an item, rolling the random range for mystery crates.
 * @param {string} slug
 * @param {() => number} [rng]
 * @returns {number}
 */
export function getItemPoints(slug, rng) {
  const item = getItemBySlug(slug);
  if (!item) return 0;
  if (item.randomRange) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const { min, max } = item.randomRange;
    const span = Math.max(0, max - min);
    return Math.round(min + random() * span);
  }
  return item.points;
}

/**
 * Pick an item using the catalogue spawn weights.
 * Optionally biased by a luck value (0..10) which boosts rarer items.
 * @param {() => number} [rng] Random source returning 0..1
 * @param {number} [luck] Character luck stat (0..10)
 * @returns {object} item definition
 */
export function pickWeightedItem(rng, luck) {
  const random = typeof rng === 'function' ? rng : Math.random;
  const luckValue = Number.isFinite(luck) ? Math.max(0, Math.min(10, luck)) : 5;
  const luckBoost = 1 + luckValue / 10;

  const weighted = ITEMS.map((item) => {
    let weight = item.spawnWeight;
    if (item.rarity === 'rare') weight *= luckBoost;
    if (item.rarity === 'legendary') weight *= luckBoost * luckBoost;
    if (item.isHazard) weight /= luckBoost;
    return { item, weight: Math.max(0.0001, weight) };
  });

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!Number.isFinite(total) || total <= 0) return FALLBACK_ITEM;

  let roll = random() * total;
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) return weighted[i].item;
  }
  return weighted[weighted.length - 1].item;
}

export default ITEMS;