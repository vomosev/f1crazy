/**
 * F1 Crazy — database seeder
 *
 * Usage:  node server/db/seed.js
 *
 * Upserts the character and item catalogues (kept consistent with
 * lib/game/characters.js, lib/game/items.js and schema.sql) and optionally
 * creates a demo user with a few sample races.
 *
 * Exits 0 on success, 1 on failure.
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool, checkDatabaseConnection } = require('../config/db');

const CHARACTERS = [
  {
    slug: 'banana-baron',
    name: 'Banana Baron',
    tagline: 'Slippery when fast.',
    description:
      'A moustachioed aristocrat who insists on racing in a banana-yellow cape. Corners like a dropped peel, but somehow always lands on the podium.',
    top_speed: 7,
    handling: 8,
    luck: 9,
    accent_color: '#f7d046',
    unlock_points: 0,
    is_starter: 1,
  },
  {
    slug: 'pineapple-pete',
    name: 'Pineapple Pete',
    tagline: 'Spiky on the outside, fearless inside.',
    description:
      'Pete wears a pineapple for a helmet and claims it improves aerodynamics. Nobody has proven him wrong around the Monaco harbour.',
    top_speed: 8,
    handling: 6,
    luck: 7,
    accent_color: '#ffb02e',
    unlock_points: 0,
    is_starter: 1,
  },
  {
    slug: 'turbo-tortoise',
    name: 'Turbo Tortoise',
    tagline: 'Slow start, silly finish.',
    description:
      'Strapped a jet engine to a shell. Takes an age to get going through Sainte-Devote, then absolutely rockets through the tunnel.',
    top_speed: 9,
    handling: 4,
    luck: 6,
    accent_color: '#3ecf8e',
    unlock_points: 1500,
    is_starter: 0,
  },
  {
    slug: 'disco-dolores',
    name: 'Disco Dolores',
    tagline: 'Glitterball on wheels.',
    description:
      'Races with a mirrorball mounted on the roll hoop. Blinds the marshals, dazzles the crowd, collects every pineapple on the circuit.',
    top_speed: 6,
    handling: 9,
    luck: 8,
    accent_color: '#ff4fa3',
    unlock_points: 3000,
    is_starter: 0,
  },
  {
    slug: 'sir-honks-a-lot',
    name: 'Sir Honks-a-Lot',
    tagline: 'Honk first, brake later.',
    description:
      'A rubber duck the size of a sofa with a steering wheel. His horn has been banned in three principalities, Monaco not among them.',
    top_speed: 7,
    handling: 7,
    luck: 10,
    accent_color: '#ffd93d',
    unlock_points: 5000,
    is_starter: 0,
  },
  {
    slug: 'neon-nina',
    name: 'Neon Nina',
    tagline: 'Built for the tunnel.',
    description:
      'Drives a car that is 90% LED strip. Nobody can see the racing line behind her, which she insists is a legitimate strategy.',
    top_speed: 10,
    handling: 7,
    luck: 5,
    accent_color: '#4fd6ff',
    unlock_points: 8000,
    is_starter: 0,
  },
];

const ITEMS = [
  {
    slug: 'banana',
    name: 'Banana',
    svg_key: 'banana',
    points_value: 25,
    rarity: 'common',
    description: 'The classic. Worth a handful of points and a lot of giggles.',
  },
  {
    slug: 'pineapple',
    name: 'Pineapple',
    svg_key: 'pineapple',
    points_value: 50,
    rarity: 'common',
    description: 'Prickly, tropical and surprisingly aerodynamic at 200 km/h.',
  },
  {
    slug: 'rubber-duck',
    name: 'Rubber Duck',
    svg_key: 'rubber-duck',
    points_value: 40,
    rarity: 'common',
    description: 'Floats out of the harbour and onto the racing line. Honk.',
  },
  {
    slug: 'traffic-cone',
    name: 'Traffic Cone',
    svg_key: 'traffic-cone',
    points_value: -15,
    rarity: 'common',
    description: 'A hazard. Clip one and the marshals deduct points immediately.',
  },
  {
    slug: 'flying-baguette',
    name: 'Flying Baguette',
    svg_key: 'flying-baguette',
    points_value: 75,
    rarity: 'rare',
    description: 'Launched from a balcony above Casino Square. Crusty and valuable.',
  },
  {
    slug: 'golden-pineapple',
    name: 'Golden Pineapple',
    svg_key: 'golden-pineapple',
    points_value: 250,
    rarity: 'legendary',
    description: 'The crown jewel of the Monaco scramble. Very rare, very shiny.',
  },
  {
    slug: 'mystery-crate',
    name: 'Mystery Crate',
    svg_key: 'mystery-crate',
    points_value: 100,
    rarity: 'rare',
    description: 'Could be anything. Usually fruit. Occasionally more fruit.',
  },
];

const DEMO_USER = {
  username: 'paddock_pete',
  email: 'paddock_pete@example.com',
  password: 'MonacoCrazy2024',
  selected_character_slug: 'pineapple-pete',
};

const DEMO_RACES = [
  {
    character_slug: 'pineapple-pete',
    score: 1375,
    items_collected: 18,
    best_lap_ms: 48230,
    total_time_ms: 151900,
    laps: 3,
  },
  {
    character_slug: 'banana-baron',
    score: 1890,
    items_collected: 24,
    best_lap_ms: 46110,
    total_time_ms: 146450,
    laps: 3,
  },
  {
    character_slug: 'pineapple-pete',
    score: 2420,
    items_collected: 29,
    best_lap_ms: 44980,
    total_time_ms: 142300,
    laps: 3,
  },
];

const DEMO_INVENTORY = [
  { item_slug: 'banana', quantity: 31 },
  { item_slug: 'pineapple', quantity: 19 },
  { item_slug: 'rubber-duck', quantity: 12 },
  { item_slug: 'flying-baguette', quantity: 5 },
  { item_slug: 'golden-pineapple', quantity: 1 },
];

async function seedCharacters() {
  let inserted = 0;
  for (const c of CHARACTERS) {
    const [result] = await pool.execute(
      `INSERT INTO characters
         (slug, name, tagline, description, top_speed, handling, luck, accent_color, unlock_points, is_starter)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         tagline = VALUES(tagline),
         description = VALUES(description),
         top_speed = VALUES(top_speed),
         handling = VALUES(handling),
         luck = VALUES(luck),
         accent_color = VALUES(accent_color),
         unlock_points = VALUES(unlock_points),
         is_starter = VALUES(is_starter)`,
      [
        c.slug,
        c.name,
        c.tagline,
        c.description,
        c.top_speed,
        c.handling,
        c.luck,
        c.accent_color,
        c.unlock_points,
        c.is_starter,
      ]
    );
    if (result.affectedRows === 1) inserted += 1;
  }
  return { total: CHARACTERS.length, inserted };
}

async function seedItems() {
  let inserted = 0;
  for (const i of ITEMS) {
    const [result] = await pool.execute(
      `INSERT INTO items (slug, name, svg_key, points_value, rarity, description)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         svg_key = VALUES(svg_key),
         points_value = VALUES(points_value),
         rarity = VALUES(rarity),
         description = VALUES(description)`,
      [i.slug, i.name, i.svg_key, i.points_value, i.rarity, i.description]
    );
    if (result.affectedRows === 1) inserted += 1;
  }
  return { total: ITEMS.length, inserted };
}

async function seedDemoUser() {
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);

  await pool.execute(
    `INSERT INTO users (username, email, password_hash, selected_character_slug, total_points, races_played)
     VALUES (?, ?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       selected_character_slug = VALUES(selected_character_slug)`,
    [DEMO_USER.username, DEMO_USER.email, passwordHash, DEMO_USER.selected_character_slug]
  );

  const [userRows] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [
    DEMO_USER.username,
  ]);

  if (!userRows.length) {
    throw new Error('Demo user could not be created or found.');
  }

  const userId = userRows[0].id;

  // Reset the demo user's races so re-running the seeder stays idempotent.
  await pool.execute('DELETE FROM races WHERE user_id = ?', [userId]);

  let totalPoints = 0;
  for (const race of DEMO_RACES) {
    await pool.execute(
      `INSERT INTO races
         (user_id, character_slug, score, items_collected, best_lap_ms, total_time_ms, laps)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        race.character_slug,
        race.score,
        race.items_collected,
        race.best_lap_ms,
        race.total_time_ms,
        race.laps,
      ]
    );
    totalPoints += race.score;
  }

  for (const inv of DEMO_INVENTORY) {
    await pool.execute(
      `INSERT INTO inventories (user_id, item_slug, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
      [userId, inv.item_slug, inv.quantity]
    );
  }

  await pool.execute(
    'UPDATE users SET total_points = ?, races_played = ? WHERE id = ?',
    [totalPoints, DEMO_RACES.length, userId]
  );

  return { userId, races: DEMO_RACES.length, totalPoints };
}

async function main() {
  console.log('F1 Crazy :: seeding database...');

  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    throw new Error(
      'Could not connect to MySQL. Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in your .env file.'
    );
  }
  console.log(`  - connected to database "${process.env.DB_NAME || '(unset DB_NAME)'}"`);

  const characters = await seedCharacters();
  console.log(
    `  - characters: ${characters.total} upserted (${characters.inserted} newly inserted)`
  );

  const items = await seedItems();
  console.log(`  - items: ${items.total} upserted (${items.inserted} newly inserted)`);

  const skipDemo = process.argv.includes('--no-demo');
  if (skipDemo) {
    console.log('  - demo user: skipped (--no-demo)');
  } else {
    const demo = await seedDemoUser();
    console.log(
      `  - demo user "${DEMO_USER.username}" (id ${demo.userId}) with ${demo.races} races, ${demo.totalPoints} points`
    );
    console.log(`    login: ${DEMO_USER.username} / ${DEMO_USER.password}`);
  }

  console.log('Seeding complete.');
}

main()
  .then(async () => {
    try {
      await pool.end();
    } catch (err) {
      // Pool already closed or never opened — nothing meaningful to do here.
    }
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Seeding failed:', err && err.message ? err.message : err);
    if (err && err.code) console.error('MySQL error code:', err.code);
    try {
      await pool.end();
    } catch (closeErr) {
      // Ignore close errors during failure shutdown.
    }
    process.exit(1);
  });