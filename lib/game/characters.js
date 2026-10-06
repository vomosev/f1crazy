// Static fallback character catalogue for F1 Crazy.
// Mirrors the seed rows in schema.sql / server/db/seed.js so the UI still works
// when the API is unreachable.

export const CHARACTERS = [
  {
    slug: 'banana-baron',
    name: 'Banana Baron',
    tagline: 'Slippery when fast.',
    description:
      'A monocled aristocrat of the fruit bowl who treats every Monaco kerb like a dance floor. Balanced in every discipline and the friendliest car to learn the circuit in.',
    topSpeed: 7,
    handling: 7,
    luck: 6,
    accentColor: '#f5c518',
    unlockPoints: 0,
    isStarter: true
  },
  {
    slug: 'pineapple-pete',
    name: 'Pineapple Pete',
    tagline: 'Spiky on the outside, turbo on the inside.',
    description:
      'Pete lost his helmet years ago and simply never noticed. He trades a little grip for raw straight-line punch down the tunnel run.',
    topSpeed: 9,
    handling: 5,
    luck: 6,
    accentColor: '#ffb020',
    unlockPoints: 0,
    isStarter: true
  },
  {
    slug: 'turbo-tortoise',
    name: 'Turbo Tortoise',
    tagline: 'Slow and steady wins the hairpin.',
    description:
      'Carries his own aerodynamic shell. What he lacks in top speed he makes up for with absurd cornering stability through the Grand Hotel Hairpin.',
    topSpeed: 5,
    handling: 9,
    luck: 7,
    accentColor: '#3ddc84',
    unlockPoints: 0,
    isStarter: true
  },
  {
    slug: 'disco-dolores',
    name: 'Disco Dolores',
    tagline: 'Glitterball in a crash helmet.',
    description:
      'Races to a four-on-the-floor beat and somehow always lands on the rare pickups. Her mirrorball visor blinds the item crates into surrendering.',
    topSpeed: 7,
    handling: 6,
    luck: 9,
    accentColor: '#ff4fd8',
    unlockPoints: 1500,
    isStarter: false
  },
  {
    slug: 'sir-honks-a-lot',
    name: 'Sir Honks-A-Lot',
    tagline: 'The goose that got a superlicence.',
    description:
      'An unhinged waterfowl with a bicycle horn bolted to the steering wheel. Ferociously quick, borderline uncontrollable at Nouvelle Chicane.',
    topSpeed: 10,
    handling: 4,
    luck: 7,
    accentColor: '#7aa2ff',
    unlockPoints: 4000,
    isStarter: false
  },
  {
    slug: 'neon-nina',
    name: 'Neon Nina',
    tagline: 'Street lights are just slow strobes.',
    description:
      'Grew up racing the tunnel at midnight. The complete package: huge pace, sharp turn-in and a nose for golden pineapples.',
    topSpeed: 9,
    handling: 8,
    luck: 8,
    accentColor: '#00e5ff',
    unlockPoints: 9000,
    isStarter: false
  }
];

export const DEFAULT_CHARACTER_SLUG = 'banana-baron';

export function getCharacterBySlug(slug) {
  if (!slug) return null;
  const needle = String(slug).trim().toLowerCase();
  return CHARACTERS.find((character) => character.slug === needle) || null;
}

export function getStarterCharacters() {
  return CHARACTERS.filter((character) => character.isStarter);
}

export function getDefaultCharacter() {
  return getCharacterBySlug(DEFAULT_CHARACTER_SLUG) || CHARACTERS[0];
}

/**
 * Normalises a character record coming from the API (snake_case columns)
 * into the camelCase shape used across the UI. Falls back to the static
 * catalogue entry for any missing field.
 */
export function normalizeCharacter(raw) {
  if (!raw || typeof raw !== 'object') return getDefaultCharacter();
  const slug = raw.slug || raw.character_slug || DEFAULT_CHARACTER_SLUG;
  const fallback = getCharacterBySlug(slug) || getDefaultCharacter();
  const num = (value, fb) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fb;
  };
  return {
    slug,
    name: raw.name || fallback.name,
    tagline: raw.tagline || fallback.tagline,
    description: raw.description || fallback.description,
    topSpeed: num(raw.topSpeed ?? raw.top_speed, fallback.topSpeed),
    handling: num(raw.handling, fallback.handling),
    luck: num(raw.luck, fallback.luck),
    accentColor: raw.accentColor || raw.accent_color || fallback.accentColor,
    unlockPoints: num(raw.unlockPoints ?? raw.unlock_points, fallback.unlockPoints),
    isStarter: Boolean(
      raw.isStarter ?? raw.is_starter ?? fallback.isStarter
    )
  };
}

export function isCharacterUnlocked(character, totalPoints = 0) {
  if (!character) return false;
  if (character.isStarter) return true;
  return Number(totalPoints || 0) >= Number(character.unlockPoints || 0);
}

export default CHARACTERS;