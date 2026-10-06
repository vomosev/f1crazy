// lib/game/track.js
// Monaco Street Circuit definition for the F1 Crazy arcade racer.
// Pure data + geometry helpers. No DOM, no framework dependencies.

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;
const TRACK_WIDTH = 86;

/**
 * Approximated Monaco layout in world units (top-left origin).
 * Each waypoint carries the name of the corner/section it approximates so the
 * renderer and HUD can label sectors.
 */
const CENTERLINE = [
  { x: 300, y: 760, name: 'Start/Finish Straight' },
  { x: 420, y: 752, name: 'Start/Finish Straight' },
  { x: 540, y: 742, name: 'Sainte-Dévote' },
  { x: 610, y: 712, name: 'Sainte-Dévote' },
  { x: 646, y: 652, name: 'Beau Rivage' },
  { x: 672, y: 574, name: 'Beau Rivage' },
  { x: 694, y: 498, name: 'Massenet' },
  { x: 700, y: 430, name: 'Massenet' },
  { x: 672, y: 374, name: 'Casino Square' },
  { x: 606, y: 340, name: 'Casino Square' },
  { x: 528, y: 322, name: 'Mirabeau Haute' },
  { x: 456, y: 310, name: 'Mirabeau Haute' },
  { x: 398, y: 292, name: 'Grand Hotel Hairpin' },
  { x: 352, y: 250, name: 'Grand Hotel Hairpin' },
  { x: 348, y: 198, name: 'Grand Hotel Hairpin' },
  { x: 392, y: 168, name: 'Mirabeau Bas' },
  { x: 462, y: 158, name: 'Mirabeau Bas' },
  { x: 548, y: 152, name: 'Portier' },
  { x: 638, y: 150, name: 'Portier' },
  { x: 740, y: 156, name: 'Tunnel' },
  { x: 852, y: 170, name: 'Tunnel' },
  { x: 962, y: 192, name: 'Tunnel' },
  { x: 1064, y: 220, name: 'Tunnel Exit' },
  { x: 1156, y: 256, name: 'Nouvelle Chicane' },
  { x: 1222, y: 302, name: 'Nouvelle Chicane' },
  { x: 1256, y: 362, name: 'Tabac' },
  { x: 1300, y: 432, name: 'Tabac' },
  { x: 1340, y: 506, name: 'Swimming Pool' },
  { x: 1352, y: 578, name: 'Swimming Pool' },
  { x: 1318, y: 648, name: 'Swimming Pool Exit' },
  { x: 1246, y: 694, name: 'La Rascasse' },
  { x: 1160, y: 718, name: 'La Rascasse' },
  { x: 1070, y: 736, name: 'Anthony Noghès' },
  { x: 962, y: 752, name: 'Anthony Noghès' },
  { x: 840, y: 766, name: 'Pit Straight' },
  { x: 720, y: 774, name: 'Pit Straight' },
  { x: 600, y: 776, name: 'Pit Straight' },
  { x: 460, y: 772, name: 'Pit Straight' },
  { x: 370, y: 768, name: 'Start/Finish Straight' }
];

function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function computeSegments(points) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const length = dist(a.x, a.y, b.x, b.y);
    segments.push({
      index: i,
      ax: a.x,
      ay: a.y,
      bx: b.x,
      by: b.y,
      length,
      startDistance: total,
      heading: Math.atan2(b.y - a.y, b.x - a.x),
      name: a.name || 'Monaco'
    });
    total += length;
  }
  return { segments, total };
}

const { segments: SEGMENTS, total: TRACK_LENGTH } = computeSegments(CENTERLINE);

/**
 * Start/finish line: perpendicular to the first segment at the first waypoint.
 */
const START_SEGMENT = SEGMENTS[0];
const START_LINE = (() => {
  const nx = -Math.sin(START_SEGMENT.heading);
  const ny = Math.cos(START_SEGMENT.heading);
  const half = TRACK_WIDTH / 2 + 10;
  return {
    x: START_SEGMENT.ax,
    y: START_SEGMENT.ay,
    heading: START_SEGMENT.heading,
    x1: START_SEGMENT.ax - nx * half,
    y1: START_SEGMENT.ay - ny * half,
    x2: START_SEGMENT.ax + nx * half,
    y2: START_SEGMENT.ay + ny * half
  };
})();

export const TRACK = {
  name: 'Monaco Street Circuit',
  country: 'Monaco',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  length: TRACK_LENGTH,
  trackWidth: TRACK_WIDTH,
  laps: 3,
  centerline: CENTERLINE,
  segments: SEGMENTS,
  startLine: START_LINE,
  start: {
    x: START_SEGMENT.ax,
    y: START_SEGMENT.ay,
    heading: START_SEGMENT.heading
  },
  // The tunnel section is drawn darker; expressed as a progress range 0..1.
  tunnel: { from: 0.44, to: 0.58 },
  palette: {
    grass: '#121722',
    asphalt: '#2a2f3b',
    asphaltDark: '#20242e',
    kerbA: '#e5352b',
    kerbB: '#f4f6fb',
    barrier: '#8a93a6',
    line: '#f4f6fb',
    tunnel: '#15181f',
    sea: '#13344a'
  }
};

/**
 * Build the list of outer/inner polygon points for the track surface.
 * Returns { centre, outer, inner } arrays of {x,y}.
 */
export function buildTrackPath(trackWidth = TRACK_WIDTH) {
  const half = trackWidth / 2;
  const centre = [];
  const outer = [];
  const inner = [];
  const count = CENTERLINE.length;

  for (let i = 0; i < count; i += 1) {
    const prev = CENTERLINE[(i - 1 + count) % count];
    const curr = CENTERLINE[i];
    const next = CENTERLINE[(i + 1) % count];

    const h1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const h2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    // Average heading using vector sum to avoid wrap-around issues.
    const hx = Math.cos(h1) + Math.cos(h2);
    const hy = Math.sin(h1) + Math.sin(h2);
    const heading = Math.atan2(hy, hx);

    const nx = -Math.sin(heading);
    const ny = Math.cos(heading);

    centre.push({ x: curr.x, y: curr.y, heading, name: curr.name });
    outer.push({ x: curr.x + nx * half, y: curr.y + ny * half });
    inner.push({ x: curr.x - nx * half, y: curr.y - ny * half });
  }

  return { centre, outer, inner, closed: true };
}

/**
 * Sample a point on the centreline at normalised progress t (0..1, wraps).
 * Returns {x, y, heading, progress, section}.
 */
export function sampleTrackPoint(t) {
  const clamped = Number.isFinite(t) ? t : 0;
  let progress = clamped % 1;
  if (progress < 0) progress += 1;

  const target = progress * TRACK_LENGTH;
  let seg = SEGMENTS[SEGMENTS.length - 1];

  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const s = SEGMENTS[i];
    if (target >= s.startDistance && target <= s.startDistance + s.length) {
      seg = s;
      break;
    }
  }

  const local = seg.length > 0 ? (target - seg.startDistance) / seg.length : 0;
  const ratio = Math.min(1, Math.max(0, local));

  return {
    x: seg.ax + (seg.bx - seg.ax) * ratio,
    y: seg.ay + (seg.by - seg.ay) * ratio,
    heading: seg.heading,
    progress,
    section: seg.name
  };
}

/**
 * Offset a centreline sample sideways by `offset` world units.
 */
export function offsetFromCentre(t, offset) {
  const p = sampleTrackPoint(t);
  const nx = -Math.sin(p.heading);
  const ny = Math.cos(p.heading);
  return {
    x: p.x + nx * offset,
    y: p.y + ny * offset,
    heading: p.heading,
    progress: p.progress,
    section: p.section
  };
}

function projectOnSegment(px, py, seg) {
  const dx = seg.bx - seg.ax;
  const dy = seg.by - seg.ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { t: 0, x: seg.ax, y: seg.ay, distance: dist(px, py, seg.ax, seg.ay) };
  }
  let t = ((px - seg.ax) * dx + (py - seg.ay) * dy) / lenSq;
  t = Math.min(1, Math.max(0, t));
  const cx = seg.ax + dx * t;
  const cy = seg.ay + dy * t;
  return { t, x: cx, y: cy, distance: dist(px, py, cx, cy) };
}

/**
 * Find the closest point on the centreline to (x, y).
 * Returns {distanceFromCentre, progress, heading, section, signedOffset, onTrack}.
 */
export function nearestCentrelineInfo(x, y) {
  const px = Number.isFinite(x) ? x : 0;
  const py = Number.isFinite(y) ? y : 0;

  let best = null;
  let bestSeg = SEGMENTS[0];

  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const seg = SEGMENTS[i];
    const proj = projectOnSegment(px, py, seg);
    if (!best || proj.distance < best.distance) {
      best = proj;
      bestSeg = seg;
    }
  }

  const travelled = bestSeg.startDistance + bestSeg.length * best.t;
  const progress = TRACK_LENGTH > 0 ? travelled / TRACK_LENGTH : 0;

  // Signed lateral offset: positive on the left-hand normal.
  const nx = -Math.sin(bestSeg.heading);
  const ny = Math.cos(bestSeg.heading);
  const signedOffset = (px - best.x) * nx + (py - best.y) * ny;

  return {
    distanceFromCentre: best.distance,
    signedOffset,
    progress,
    heading: bestSeg.heading,
    section: bestSeg.name,
    closestX: best.x,
    closestY: best.y,
    segmentIndex: bestSeg.index,
    onTrack: best.distance <= TRACK_WIDTH / 2
  };
}

/**
 * Pre-computed candidate spawn positions for crazy items.
 * Spread evenly around the lap with a few lateral lanes so pickups are
 * reachable without driving off the barriers.
 */
function buildSpawnPoints() {
  const points = [];
  const COUNT = 48;
  const lanes = [-0.52, -0.22, 0, 0.22, 0.52];

  for (let i = 0; i < COUNT; i += 1) {
    const t = i / COUNT;
    const lane = lanes[i % lanes.length];
    const offset = lane * (TRACK_WIDTH * 0.8);
    const p = offsetFromCentre(t, offset);
    points.push({
      id: `spawn-${i}`,
      x: p.x,
      y: p.y,
      progress: p.progress,
      lane,
      section: p.section
    });
  }
  return points;
}

export const SPAWN_POINTS = buildSpawnPoints();

/**
 * Pick a spawn point ahead of the car's current progress.
 */
export function pickSpawnPoint(progress, rng = Math.random) {
  if (!SPAWN_POINTS.length) return null;
  const base = Number.isFinite(progress) ? progress : 0;
  const ahead = SPAWN_POINTS.filter((p) => {
    let delta = p.progress - (base % 1);
    if (delta < 0) delta += 1;
    return delta > 0.05 && delta < 0.5;
  });
  const pool = ahead.length ? ahead : SPAWN_POINTS;
  const index = Math.floor(rng() * pool.length) % pool.length;
  return pool[index];
}

/**
 * True when the segment between two successive positions crosses the
 * start/finish line in the forward direction.
 */
export function crossedStartLine(prevProgress, nextProgress) {
  if (!Number.isFinite(prevProgress) || !Number.isFinite(nextProgress)) return false;
  const p = prevProgress % 1;
  const n = nextProgress % 1;
  // Forward wrap from near 1 back to near 0.
  return p > 0.75 && n < 0.25;
}

export default TRACK;