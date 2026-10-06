// lib/game/engine.js
// Framework-free, DOM-light race engine for F1 Crazy.
// Only touches the provided canvas element — no window/document access required
// beyond what the host component supplies (input is pushed in via setInput).

import {
  TRACK,
  sampleTrackPoint,
  nearestCentrelineInfo,
  SPAWN_POINTS,
} from './track.js';
import { ITEMS, getItemBySlug, pickWeightedItem } from './items.js';
import { getCharacterBySlug, DEFAULT_CHARACTER_SLUG } from './characters.js';

export const PALETTE = {
  sky: '#0b0e14',
  sea: '#10243a',
  ground: '#141922',
  groundAlt: '#1a212c',
  asphalt: '#2b2f38',
  asphaltDark: '#23262e',
  centreLine: '#3c424e',
  kerbA: '#e4002b',
  kerbB: '#f3f4f6',
  barrier: '#8a919e',
  barrierShadow: '#555b66',
  tunnel: '#0d1017',
  tunnelGlow: '#f6c945',
  startLine: '#f3f4f6',
  startLineAlt: '#1b1f27',
  text: '#f3f4f6',
  textMuted: '#9aa3b2',
  accent: '#e4002b',
  carShadow: 'rgba(0,0,0,0.45)',
  itemGlow: 'rgba(246, 201, 69, 0.35)',
  hazard: '#ff8a3d',
  legendary: '#f6c945',
  rare: '#49c6e5',
  common: '#9be15d',
};

export const RACE_LAPS = 3;

const FIXED_DT = 1 / 120; // seconds
const MAX_FRAME_DT = 0.25; // clamp long tab-switch gaps
const MAX_ITEMS_ON_TRACK = 14;
const ITEM_PICKUP_RADIUS = 26;
const CAR_LENGTH = 34;
const CAR_WIDTH = 18;

const TAU = Math.PI * 2;

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Tiny deterministic-ish RNG (mulberry32). */
function createRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rarityColour(rarity) {
  if (rarity === 'legendary') return PALETTE.legendary;
  if (rarity === 'rare') return PALETTE.rare;
  return PALETTE.common;
}

function defaultTrack() {
  return TRACK;
}

function normaliseCharacter(character) {
  const base =
    (character && typeof character === 'object' ? character : null) ||
    getCharacterBySlug(DEFAULT_CHARACTER_SLUG) ||
    null;

  const slug = (base && (base.slug || base.characterSlug)) || DEFAULT_CHARACTER_SLUG;
  const topSpeed = Number(base && (base.topSpeed ?? base.top_speed)) || 70;
  const handling = Number(base && (base.handling ?? base.handling_rating)) || 70;
  const luck = Number(base && (base.luck ?? base.luck_rating)) || 50;
  const accentColor =
    (base && (base.accentColor || base.accent_color)) || PALETTE.accent;

  return {
    slug,
    name: (base && base.name) || 'Mystery Driver',
    topSpeed: clamp(topSpeed, 1, 100),
    handling: clamp(handling, 1, 100),
    luck: clamp(luck, 0, 100),
    accentColor,
  };
}

function normaliseItems(items) {
  const list = Array.isArray(items) && items.length ? items : ITEMS;
  return list
    .filter((i) => i && i.slug)
    .map((i) => ({
      slug: i.slug,
      name: i.name || i.slug,
      points: Number(i.points) || 0,
      rarity: i.rarity || 'common',
      spawnWeight: Number(i.spawnWeight) > 0 ? Number(i.spawnWeight) : 1,
      isHazard: Boolean(i.isHazard),
    }));
}

function pickSpawnItem(catalogue, rng, luck) {
  // Prefer the shared helper so UI and engine agree on odds.
  let chosen = null;
  try {
    chosen = pickWeightedItem(rng);
  } catch (err) {
    chosen = null;
  }
  if (!chosen) {
    const total = catalogue.reduce((sum, i) => sum + i.spawnWeight, 0) || 1;
    let roll = rng() * total;
    for (let i = 0; i < catalogue.length; i += 1) {
      roll -= catalogue[i].spawnWeight;
      if (roll <= 0) {
        chosen = catalogue[i];
        break;
      }
    }
    if (!chosen) chosen = catalogue[0];
  }

  const match =
    catalogue.find((i) => i.slug === chosen.slug) || normaliseItems([chosen])[0];

  // Lucky drivers re-roll hazards and occasionally upgrade to something shiny.
  if (match.isHazard && rng() < luck / 220) {
    const treats = catalogue.filter((i) => !i.isHazard);
    if (treats.length) return treats[Math.floor(rng() * treats.length)];
  }
  return match;
}

function resolveMysteryPoints(item, rng) {
  if (item.slug !== 'mystery-crate') return item.points;
  const outcomes = [10, 30, 60, 120, 200];
  return outcomes[Math.floor(rng() * outcomes.length)];
}

/**
 * createRaceEngine
 * @param {Object} config
 * @param {HTMLCanvasElement} config.canvas
 * @param {Object} config.character
 * @param {Object} [config.track]
 * @param {Array}  [config.items]
 * @param {Object} [config.callbacks] {onScore,onLap,onFinish,onTick,onCountdown}
 * @param {number} [config.laps]
 */
export function createRaceEngine(config = {}) {
  const canvas = config.canvas || null;
  const track = config.track || defaultTrack();
  const catalogue = normaliseItems(config.items);
  const callbacks = config.callbacks || {};
  const totalLaps = clamp(Number(config.laps) || RACE_LAPS, 1, 10);
  let character = normaliseCharacter(config.character);

  const ctx = canvas && typeof canvas.getContext === 'function'
    ? canvas.getContext('2d')
    : null;

  let rng = createRng(Math.floor(Math.random() * 0xffffffff) || 1);

  const input = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
  };

  const state = {
    status: 'idle', // idle | countdown | racing | finished
    countdown: 3,
    countdownTimer: 0,
    elapsedMs: 0,
    lapStartMs: 0,
    lap: 1,
    totalLaps,
    bestLapMs: null,
    lapTimes: [],
    score: 0,
    items: [], // collected tallies {slug,count,points}
    lastItems: [], // last 3 collected slugs
    speed: 0,
    maxSpeed: 0,
    offTrack: false,
    progress: 0,
    finished: false,
  };

  const car = {
    x: 0,
    y: 0,
    heading: 0,
    speed: 0,
    lateral: 0,
    lapProgress: 0,
    prevProgress: 0,
    spinTimer: 0,
  };

  let activeItems = [];
  let spawnTimer = 0;
  let rafId = null;
  let lastTimestamp = 0;
  let accumulator = 0;
  let running = false;
  let destroyed = false;
  let tickAccumulator = 0;
  const floaters = [];

  // --- derived character physics ---------------------------------------
  function physics() {
    const topSpeed = 210 + character.topSpeed * 2.1; // px/s
    const accel = 150 + character.topSpeed * 1.35;
    const brakePower = 320 + character.handling * 1.4;
    const steerRate = 1.5 + character.handling * 0.019; // rad/s at speed
    const grip = 0.55 + character.handling * 0.0045;
    return { topSpeed, accel, brakePower, steerRate, grip };
  }

  // --- placement helpers ------------------------------------------------
  function placeAtStart() {
    const p0 = sampleTrackPoint(0);
    const p1 = sampleTrackPoint(0.004);
    car.x = p0.x;
    car.y = p0.y;
    car.heading = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    car.speed = 0;
    car.lateral = 0;
    car.lapProgress = 0;
    car.prevProgress = 0;
    car.spinTimer = 0;
  }

  function spawnPointList() {
    if (Array.isArray(SPAWN_POINTS) && SPAWN_POINTS.length) return SPAWN_POINTS;
    const pts = [];
    for (let i = 0; i < 24; i += 1) {
      const t = i / 24;
      const p = sampleTrackPoint(t);
      pts.push({ x: p.x, y: p.y, t });
    }
    return pts;
  }

  const spawnPoints = spawnPointList();

  function spawnItem() {
    if (activeItems.length >= MAX_ITEMS_ON_TRACK) return;
    const base = spawnPoints[Math.floor(rng() * spawnPoints.length)];
    if (!base) return;
    const def = pickSpawnItem(catalogue, rng, character.luck);
    if (!def) return;

    const halfWidth = (track.trackWidth || 90) * 0.5;
    const offset = (rng() * 2 - 1) * halfWidth * 0.6;
    const t = typeof base.t === 'number' ? base.t : rng();
    const p = sampleTrackPoint(t);
    const nx = -Math.sin(p.heading != null ? p.heading : 0);
    const ny = Math.cos(p.heading != null ? p.heading : 0);

    activeItems.push({
      id: `${def.slug}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
      slug: def.slug,
      points: resolveMysteryPoints(def, rng),
      rarity: def.rarity,
      isHazard: def.isHazard,
      x: (base.x != null ? base.x : p.x) + nx * offset,
      y: (base.y != null ? base.y : p.y) + ny * offset,
      bob: rng() * TAU,
      life: 14 + rng() * 10,
    });
  }

  function seedItems() {
    activeItems = [];
    const seedCount = Math.min(MAX_ITEMS_ON_TRACK, 8 + Math.floor(character.luck / 25));
    for (let i = 0; i < seedCount; i += 1) spawnItem();
  }

  // --- scoring ----------------------------------------------------------
  function registerCollect(item) {
    const existing = state.items.find((i) => i.slug === item.slug);
    if (existing) {
      existing.count += 1;
      existing.points += item.points;
    } else {
      state.items.push({ slug: item.slug, count: 1, points: item.points });
    }
    state.score = Math.max(0, state.score + item.points);
    state.lastItems = [item.slug, ...state.lastItems].slice(0, 3);

    floaters.push({
      x: item.x,
      y: item.y,
      life: 1,
      text: `${item.points >= 0 ? '+' : ''}${item.points}`,
      colour: item.isHazard ? PALETTE.hazard : rarityColour(item.rarity),
    });

    if (typeof callbacks.onScore === 'function') {
      try {
        callbacks.onScore(item.points, {
          slug: item.slug,
          points: item.points,
          rarity: item.rarity,
          isHazard: Boolean(item.isHazard),
        });
      } catch (err) {
        /* host callback errors must never break the loop */
      }
    }
  }

  function completeLap() {
    const lapMs = Math.max(0, state.elapsedMs - state.lapStartMs);
    state.lapStartMs = state.elapsedMs;
    state.lapTimes.push(lapMs);
    if (state.bestLapMs == null || lapMs < state.bestLapMs) state.bestLapMs = lapMs;

    if (typeof callbacks.onLap === 'function') {
      try {
        callbacks.onLap(lapMs, state.lap);
      } catch (err) {
        /* ignore */
      }
    }

    if (state.lap >= state.totalLaps) {
      finishRace();
    } else {
      state.lap += 1;
    }
  }

  function buildResult() {
    return {
      score: Math.round(state.score),
      laps: state.totalLaps,
      bestLapMs: state.bestLapMs == null ? null : Math.round(state.bestLapMs),
      totalTimeMs: Math.round(state.elapsedMs),
      lapTimes: state.lapTimes.map((t) => Math.round(t)),
      characterSlug: character.slug,
      items: state.items.map((i) => ({
        slug: i.slug,
        count: i.count,
        points: Math.round(i.points),
      })),
    };
  }

  function finishRace() {
    if (state.finished) return;
    state.finished = true;
    state.status = 'finished';
    running = false;
    const result = buildResult();
    if (typeof callbacks.onFinish === 'function') {
      try {
        callbacks.onFinish(result);
      } catch (err) {
        /* ignore */
      }
    }
  }

  // --- simulation -------------------------------------------------------
  function step(dt) {
    if (state.status === 'countdown') {
      state.countdownTimer -= dt;
      if (state.countdownTimer <= 0) {
        state.countdown -= 1;
        state.countdownTimer += 1;
        if (typeof callbacks.onCountdown === 'function') {
          try {
            callbacks.onCountdown(state.countdown);
          } catch (err) {
            /* ignore */
          }
        }
        if (state.countdown <= 0) {
          state.status = 'racing';
          state.elapsedMs = 0;
          state.lapStartMs = 0;
        }
      }
      return;
    }

    if (state.status !== 'racing') return;

    state.elapsedMs += dt * 1000;

    const ph = physics();
    const info = nearestCentrelineInfo(car.x, car.y) || {
      distanceFromCentre: 0,
      progress: car.lapProgress,
      heading: car.heading,
    };
    const halfWidth = (track.trackWidth || 90) * 0.5;
    const offTrack = Math.abs(info.distanceFromCentre) > halfWidth;
    state.offTrack = offTrack;

    // Throttle / brake
    let targetAccel = 0;
    if (input.throttle) targetAccel += ph.accel;
    if (input.brake) targetAccel -= ph.brakePower;
    if (!input.throttle && !input.brake) targetAccel -= 90; // coasting drag

    const speedCap = offTrack ? ph.topSpeed * 0.45 : ph.topSpeed;
    car.speed += targetAccel * dt;
    if (offTrack) car.speed -= car.speed * 1.6 * dt; // grass/barrier scrub
    car.speed = clamp(car.speed, -ph.topSpeed * 0.3, speedCap);

    // Steering — scales down at very low speed for realism
    const steerAuthority = clamp(Math.abs(car.speed) / 90, 0, 1);
    let steer = 0;
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    if (car.spinTimer > 0) {
      car.spinTimer -= dt;
      steer += Math.sin(state.elapsedMs / 60) * 0.8;
    }
    car.heading += steer * ph.steerRate * steerAuthority * dt * (car.speed < 0 ? -1 : 1);
    car.heading = ((car.heading % TAU) + TAU) % TAU;

    // Grip: blend velocity direction toward heading
    const nextX = car.x + Math.cos(car.heading) * car.speed * dt;
    const nextY = car.y + Math.sin(car.heading) * car.speed * dt;
    car.x = lerp(car.x, nextX, clamp(ph.grip + 0.4, 0, 1));
    car.y = lerp(car.y, nextY, clamp(ph.grip + 0.4, 0, 1));

    // Barrier containment — hard wall slightly beyond the kerbs
    const after = nearestCentrelineInfo(car.x, car.y);
    if (after) {
      const limit = halfWidth + 18;
      if (Math.abs(after.distanceFromCentre) > limit) {
        const p = sampleTrackPoint(after.progress);
        const nx = -Math.sin(after.heading);
        const ny = Math.cos(after.heading);
        const sign = after.distanceFromCentre >= 0 ? 1 : -1;
        car.x = p.x + nx * limit * sign;
        car.y = p.y + ny * limit * sign;
        car.speed *= 0.55;
        car.spinTimer = Math.max(car.spinTimer, 0.12);
        // nudge heading back along the track
        car.heading += angleDiff(after.heading, car.heading) * 0.25;
      }

      // Lap detection against the start/finish line (progress wrap 1 -> 0)
      const prev = car.prevProgress;
      const now = after.progress;
      if (prev > 0.75 && now < 0.25) {
        completeLap();
      }
      car.prevProgress = now;
      car.lapProgress = now;
      state.progress = now;
    }

    state.speed = Math.abs(car.speed);
    state.maxSpeed = ph.topSpeed;

    // Items
    spawnTimer -= dt;
    const spawnInterval = Math.max(0.5, 1.9 - character.luck / 110);
    if (spawnTimer <= 0) {
      spawnTimer = spawnInterval;
      spawnItem();
    }

    for (let i = activeItems.length - 1; i >= 0; i -= 1) {
      const it = activeItems[i];
      it.life -= dt;
      it.bob += dt * 3;
      const dx = it.x - car.x;
      const dy = it.y - car.y;
      if (dx * dx + dy * dy <= ITEM_PICKUP_RADIUS * ITEM_PICKUP_RADIUS) {
        registerCollect(it);
        if (it.isHazard) {
          car.speed *= 0.5;
          car.spinTimer = 0.45;
        }
        activeItems.splice(i, 1);
      } else if (it.life <= 0) {
        activeItems.splice(i, 1);
      }
    }

    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      floaters[i].life -= dt * 1.2;
      floaters[i].y -= dt * 28;
      if (floaters[i].life <= 0) floaters.splice(i, 1);
    }
  }

  // --- rendering --------------------------------------------------------
  function cssSize() {
    if (!canvas) return { w: 960, h: 540 };
    const w = canvas.clientWidth || canvas.width || 960;
    const h = canvas.clientHeight || canvas.height || 540;
    return { w, h };
  }

  function drawTrackBand(c, width, style) {
    const steps = 420;
    c.lineWidth = width;
    c.strokeStyle = style;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const p = sampleTrackPoint(i / steps);
      if (i === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    }
    c.closePath();
    c.stroke();
  }

  function drawKerbs(c, halfWidth) {
    const steps = 240;
    for (let i = 0; i < steps; i += 1) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const p0 = sampleTrackPoint(t0);
      const p1 = sampleTrackPoint(t1);
      const colour = i % 2 === 0 ? PALETTE.kerbA : PALETTE.kerbB;
      c.strokeStyle = colour;
      c.lineWidth = 5;
      for (const sign of [1, -1]) {
        const n0x = -Math.sin(p0.heading) * (halfWidth + 2) * sign;
        const n0y = Math.cos(p0.heading) * (halfWidth + 2) * sign;
        const n1x = -Math.sin(p1.heading) * (halfWidth + 2) * sign;
        const n1y = Math.cos(p1.heading) * (halfWidth + 2) * sign;
        c.beginPath();
        c.moveTo(p0.x + n0x, p0.y + n0y);
        c.lineTo(p1.x + n1x, p1.y + n1y);
        c.stroke();
      }
    }
  }

  function drawBarriers(c, halfWidth) {
    const steps = 200;
    c.lineWidth = 4;
    for (const sign of [1, -1]) {
      c.strokeStyle = PALETTE.barrier;
      c.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const p = sampleTrackPoint(i / steps);
        const nx = -Math.sin(p.heading) * (halfWidth + 16) * sign;
        const ny = Math.cos(p.heading) * (halfWidth + 16) * sign;
        if (i === 0) c.moveTo(p.x + nx, p.y + ny);
        else c.lineTo(p.x + nx, p.y + ny);
      }
      c.closePath();
      c.stroke();
    }
  }

  function drawTunnel(c, halfWidth) {
    // Tunnel section approximated between 55% and 68% of the lap.
    const start = 0.55;
    const end = 0.68;
    const steps = 48;
    c.save();
    c.strokeStyle = PALETTE.tunnel;
    c.lineWidth = (halfWidth + 14) * 2;
    c.lineCap = 'butt';
    c.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const p = sampleTrackPoint(start + ((end - start) * i) / steps);
      if (i === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    }
    c.stroke();

    c.strokeStyle = PALETTE.tunnelGlow;
    c.lineWidth = 2;
    c.globalAlpha = 0.6;
    c.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const p = sampleTrackPoint(start + ((end - start) * i) / steps);
      if (i === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    }
    c.stroke();
    c.restore();
  }

  function drawStartLine(c, halfWidth) {
    const p = sampleTrackPoint(0);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.heading);
    const cols = 8;
    const cellH = (halfWidth * 2) / cols;
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        c.fillStyle = (i + j) % 2 === 0 ? PALETTE.startLine : PALETTE.startLineAlt;
        c.fillRect(j * 7 - 7, -halfWidth + i * cellH, 7, cellH);
      }
    }
    c.restore();
  }

  function drawItemSprite(c, item) {
    const bob = Math.sin(item.bob) * 2;
    c.save();
    c.translate(item.x, item.y + bob);

    c.fillStyle = PALETTE.itemGlow;
    c.beginPath();
    c.arc(0, 0, 14, 0, TAU);
    c.fill();

    const colour = item.isHazard ? PALETTE.hazard : rarityColour(item.rarity);
    c.fillStyle = colour;
    c.strokeStyle = '#0b0e14';
    c.lineWidth = 1.5;

    switch (item.slug) {
      case 'banana': {
        c.beginPath();
        c.moveTo(-7, 5);
        c.quadraticCurveTo(0, -10, 8, -3);
        c.quadraticCurveTo(2, 2, -7, 5);
        c.closePath();
        c.fill();
        c.stroke();
        break;
      }
      case 'pineapple':
      case 'golden-pineapple': {
        c.fillStyle = item.slug === 'golden-pineapple' ? PALETTE.legendary : '#f2b705';
        c.beginPath();
        c.ellipse(0, 2, 6, 8, 0, 0, TAU);
        c.fill();
        c.stroke();
        c.strokeStyle = '#2f7d32';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(0, -6);
        c.lineTo(-4, -12);
        c.moveTo(0, -6);
        c.lineTo(0, -13);
        c.moveTo(0, -6);
        c.lineTo(4, -12);
        c.stroke();
        break;
      }
      case 'rubber-duck': {
        c.fillStyle = '#ffd400';
        c.beginPath();
        c.ellipse(0, 4, 8, 5, 0, 0, TAU);
        c.fill();
        c.beginPath();
        c.arc(4, -3, 4, 0, TAU);
        c.fill();
        c.fillStyle = PALETTE.hazard;
        c.beginPath();
        c.moveTo(7, -3);
        c.lineTo(12, -1);
        c.lineTo(7, 0);
        c.closePath();
        c.fill();
        break;
      }
      case 'traffic-cone': {
        c.fillStyle = PALETTE.hazard;
        c.beginPath();
        c.moveTo(0, -9);
        c.lineTo(7, 7);
        c.lineTo(-7, 7);
        c.closePath();
        c.fill();
        c.fillStyle = PALETTE.startLine;
        c.fillRect(-5, -1, 10, 3);
        break;
      }
      case 'flying-baguette': {
        c.fillStyle = '#d9a441';
        c.save();
        c.rotate(-0.5);
        c.beginPath();
        c.ellipse(0, 0, 10, 4, 0, 0, TAU);
        c.fill();
        c.strokeStyle = '#8a5a1f';
        c.lineWidth = 1;
        for (let i = -6; i <= 6; i += 4) {
          c.beginPath();
          c.moveTo(i, -2);
          c.lineTo(i + 2, 2);
          c.stroke();
        }
        c.restore();
        break;
      }
      case 'mystery-crate': {
        c.fillStyle = '#7a5230';
        c.fillRect(-8, -8, 16, 16);
        c.strokeStyle = '#efe6d5';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-8, -8);
        c.lineTo(8, 8);
        c.moveTo(8, -8);
        c.lineTo(-8, 8);
        c.stroke();
        break;
      }
      default: {
        c.beginPath();
        c.arc(0, 0, 7, 0, TAU);
        c.fill();
        c.stroke();
      }
    }

    c.restore();
  }

  function drawCar(c) {
    c.save();
    c.translate(car.x, car.y);
    c.rotate(car.heading);

    c.fillStyle = PALETTE.carShadow;
    c.beginPath();
    c.ellipse(0, 3, CAR_LENGTH * 0.55, CAR_WIDTH * 0.6, 0, 0, TAU);
    c.fill();

    // tyres
    c.fillStyle = '#15181f';
    c.fillRect(-CAR_LENGTH * 0.38, -CAR_WIDTH * 0.75, 8, 5);
    c.fillRect(-CAR_LENGTH * 0.38, CAR_WIDTH * 0.75 - 5, 8, 5);
    c.fillRect(CAR_LENGTH * 0.22, -CAR_WIDTH * 0.75, 8, 5);
    c.fillRect(CAR_LENGTH * 0.22, CAR_WIDTH * 0.75 - 5, 8, 5);

    // body
    c.fillStyle = character.accentColor || PALETTE.accent;
    c.beginPath();
    c.moveTo(CAR_LENGTH * 0.5, 0);
    c.lineTo(CAR_LENGTH * 0.18, -CAR_WIDTH * 0.42);
    c.lineTo(-CAR_LENGTH * 0.45, -CAR_WIDTH * 0.5);
    c.lineTo(-CAR_LENGTH * 0.45, CAR_WIDTH * 0.5);
    c.lineTo(CAR_LENGTH * 0.18, CAR_WIDTH * 0.42);
    c.closePath();
    c.fill();

    // cockpit
    c.fillStyle = '#10131a';
    c.beginPath();
    c.ellipse(-2, 0, 5, 4, 0, 0, TAU);
    c.fill();

    // rear wing
    c.fillStyle = '#2c313c';
    c.fillRect(-CAR_LENGTH * 0.52, -CAR_WIDTH * 0.55, 5, CAR_WIDTH * 1.1);

    c.restore();
  }

  function drawFloaters(c) {
    c.save();
    c.textAlign = 'center';
    c.font = '600 14px system-ui, sans-serif';
    for (const f of floaters) {
      c.globalAlpha = clamp(f.life, 0, 1);
      c.fillStyle = f.colour;
      c.fillText(f.text, f.x, f.y);
    }
    c.restore();
  }

  function drawOverlayText(c, w, h) {
    if (state.status === 'countdown') {
      c.save();
      c.fillStyle = 'rgba(11,14,20,0.55)';
      c.fillRect(0, 0, w, h);
      c.fillStyle = PALETTE.text;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '700 72px system-ui, sans-serif';
      const label = state.countdown > 0 ? String(state.countdown) : 'GO!';
      c.fillText(label, w / 2, h / 2);
      c.restore();
    } else if (state.status === 'idle') {
      c.save();
      c.fillStyle = 'rgba(11,14,20,0.5)';
      c.fillRect(0, 0, w, h);
      c.fillStyle = PALETTE.textMuted;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '600 20px system-ui, sans-serif';
      c.fillText('Press Start to hit the Monaco streets', w / 2, h / 2);
      c.restore();
    } else if (state.status === 'finished') {
      c.save();
      c.fillStyle = 'rgba(11,14,20,0.6)';
      c.fillRect(0, 0, w, h);
      c.fillStyle = PALETTE.text;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '700 40px system-ui, sans-serif';
      c.fillText('Chequered flag!', w / 2, h / 2);
      c.restore();
    }
  }

  function render() {
    if (!ctx || !canvas) return;
    const { w, h } = cssSize();
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? Math.min(window.devicePixelRatio, 2)
        : 1;

    const targetW = Math.max(1, Math.round(w * dpr));
    const targetH = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Backdrop
    ctx.fillStyle = PALETTE.sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(0, 0, w, h * 0.32);

    // Camera follows the car with a slight lead
    const zoom = clamp(Math.min(w / 980, h / 620) * 1.55, 0.55, 1.6);
    const leadX = Math.cos(car.heading) * 70;
    const leadY = Math.sin(car.heading) * 70;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-(car.x + leadX), -(car.y + leadY));

    const halfWidth = (track.trackWidth || 90) * 0.5;

    // Ground texture under the circuit
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(
      -(track.width || 1200),
      -(track.length || 900),
      (track.width || 1200) * 3,
      (track.length || 900) * 3
    );

    drawTrackBand(ctx, halfWidth * 2 + 34, PALETTE.asphaltDark);
    drawTrackBand(ctx, halfWidth * 2, PALETTE.asphalt);
    drawKerbs(ctx, halfWidth);
    drawBarriers(ctx, halfWidth);
    drawTunnel(ctx, halfWidth);
    drawStartLine(ctx, halfWidth);

    for (const item of activeItems) drawItemSprite(ctx, item);
    drawFloaters(ctx);
    drawCar(ctx);

    ctx.restore();

    drawOverlayText(ctx, w, h);
  }

  // --- loop -------------------------------------------------------------
  function emitTick() {
    if (typeof callbacks.onTick !== 'function') return;
    try {
      callbacks.onTick(getState());
    } catch (err) {
      /* ignore host errors */
    }
  }

  function frame(timestamp) {
    if (destroyed) return;
    rafId = null;

    const now = typeof timestamp === 'number' ? timestamp : 0;
    let delta = lastTimestamp ? (now - lastTimestamp) / 1000 : 0;
    lastTimestamp = now;
    if (!Number.isFinite(delta) || delta < 0) delta = 0;
    delta = Math.min(delta, MAX_FRAME_DT);

    accumulator += delta;
    let guard = 0;
    while (accumulator >= FIXED_DT && guard < 600) {
      step(FIXED_DT);
      accumulator -= FIXED_DT;
      guard += 1;
      if (state.status === 'finished') break;
    }

    render();

    tickAccumulator += delta;
    if (tickAccumulator >= 0.08) {
      tickAccumulator = 0;
      emitTick();
    }

    if (running && !destroyed) scheduleFrame();
    else if (state.status === 'finished') emitTick();
  }

  function scheduleFrame() {
    if (destroyed) return;
    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = setTimeout(() => frame(Date.now()), 16);
    }
  }

  function cancelFrame() {
    if (rafId == null) return;
    if (typeof cancelAnimationFrame === 'function') {
      try {
        cancelAnimationFrame(rafId);
      } catch (err) {
        clearTimeout(rafId);
      }
    } else {
      clearTimeout(rafId);
    }
    rafId = null;
  }

  // --- public API -------------------------------------------------------
  function reset(nextCharacter) {
    cancelFrame();
    running = false;
    if (nextCharacter) character = normaliseCharacter(nextCharacter);
    rng = createRng(Math.floor(Math.random() * 0xffffffff) || 1);

    state.status = 'idle';
    state.countdown = 3;
    state.countdownTimer = 1;
    state.elapsedMs = 0;
    state.lapStartMs = 0;
    state.lap = 1;
    state.totalLaps = totalLaps;
    state.bestLapMs = null;
    state.lapTimes = [];
    state.score = 0;
    state.items = [];
    state.lastItems = [];
    state.speed = 0;
    state.maxSpeed = physics().topSpeed;
    state.offTrack = false;
    state.progress = 0;
    state.finished = false;

    floaters.length = 0;
    spawnTimer = 0.6;
    accumulator = 0;
    tickAccumulator = 0;
    lastTimestamp = 0;

    input.throttle = false;
    input.brake = false;
    input.left = false;
    input.right = false;

    placeAtStart();
    seedItems();
    render();
    emitTick();
  }

  function start(nextCharacter) {
    if (destroyed) return;
    reset(nextCharacter);
    state.status = 'countdown';
    state.countdown = 3;
    state.countdownTimer = 1;
    running = true;
    lastTimestamp = 0;
    scheduleFrame();
  }

  function stop() {
    running = false;
    cancelFrame();
    render();
  }

  function destroy() {
    destroyed = true;
    running = false;
    cancelFrame();
    activeItems = [];
    floaters.length = 0;
  }

  function setInput(partial) {
    if (!partial || typeof partial !== 'object') return;
    if ('throttle' in partial) input.throttle = Boolean(partial.throttle);
    if ('brake' in partial) input.brake = Boolean(partial.brake);
    if ('left' in partial) input.left = Boolean(partial.left);
    if ('right' in partial) input.right = Boolean(partial.right);
  }

  function setCharacter(nextCharacter) {
    character = normaliseCharacter(nextCharacter);
    state.maxSpeed = physics().topSpeed;
  }

  function getState() {
    return {
      status: state.status,
      countdown: state.countdown,
      elapsedMs: Math.round(state.elapsedMs),
      lapMs: Math.round(Math.max(0, state.elapsedMs - state.lapStartMs)),
      lap: state.lap,
      totalLaps: state.totalLaps,
      bestLapMs: state.bestLapMs == null ? null : Math.round(state.bestLapMs),
      lapTimes: state.lapTimes.map((t) => Math.round(t)),
      score: Math.round(state.score),
      speed: Math.round(state.speed),
      maxSpeed: Math.round(state.maxSpeed),
      speedRatio: state.maxSpeed ? clamp(state.speed / state.maxSpeed, 0, 1) : 0,
      offTrack: state.offTrack,
      progress: state.progress,
      items: state.items.map((i) => ({
        slug: i.slug,
        count: i.count,
        points: Math.round(i.points),
      })),
      lastItems: state.lastItems.slice(),
      character: { slug: character.slug, name: character.name },
      finished: state.finished,
    };
  }

  function resize() {
    render();
  }

  // Prime the first frame so the canvas is never blank.
  try {
    placeAtStart();
    seedItems();
    state.maxSpeed = physics().topSpeed;
    render();
  } catch (err) {
    // Rendering must never prevent the engine from being created.
  }

  return {
    start,
    stop,
    reset,
    destroy,
    resize,
    setInput,
    setCharacter,
    getState,
    getResult: buildResult,
  };
}

export default createRaceEngine;