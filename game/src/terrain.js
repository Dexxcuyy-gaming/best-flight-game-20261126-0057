// Sunset Isles — Island Hopper: terrain height, pure math, no three.js.
// world.js builds the visible mesh from this; plane.js collides against it,
// so the ground you see is exactly the ground you can hit.

import { ISLANDS, RUNWAY, WORLD } from './config.js';

function smoothstep(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

// Height of the land at (x, z). 0 over open sea, up to the island peaks.
export function terrainHeight(x, z) {
  let h = 0;
  for (const isl of ISLANDS) {
    const dx = x - isl.cx, dz = z - isl.cz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < isl.r) {
      const t = d / isl.r;
      const dome = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * t), 1.3);
      h = Math.max(h, isl.peak * dome);
    }
  }
  // Flatten a plateau for the runway strip on the main island's south shore.
  const dx = (Math.abs(x - RUNWAY.cx) - RUNWAY.halfLength) / RUNWAY.blend;
  const dz = (Math.abs(z - RUNWAY.cz) - RUNWAY.halfWidth) / RUNWAY.blend;
  const m = 1 - Math.max(dx, dz);
  if (m > 0) {
    const f = smoothstep(0, 1, Math.min(1, m));
    h = h + (WORLD.runwayHeight - h) * f;
  }
  return h;
}

// True when (x, z) is over the sea (terrain at or below the waterline).
export function isSea(x, z) {
  return terrainHeight(x, z) < 0.6;
}

// True when (x, z) lies on the runway strip itself.
export function onRunway(x, z) {
  return Math.abs(x - RUNWAY.cx) <= RUNWAY.halfLength
      && Math.abs(z - RUNWAY.cz) <= RUNWAY.halfWidth;
}

// Colour for a terrain vertex at height h (sand, grass, rock).
// Returns [r, g, b] in 0..1 with a little deterministic variation.
export function terrainColour(x, z, h) {
  const wobble = 0.92 + 0.08 * Math.sin(x * 0.11 + z * 0.13) * Math.sin(z * 0.07 - x * 0.05);
  let c;
  if (h < 2.2) c = [0.949, 0.847, 0.627];       // sand
  else if (h < 3.2) c = [0.72, 0.82, 0.45];     // sand-to-grass blend
  else if (h < 26) c = [0.345, 0.702, 0.408];   // grass
  else if (h < 38) c = [0.247, 0.604, 0.322];   // high grass
  else c = [0.541, 0.498, 0.447];                // rock
  return [c[0] * wobble, c[1] * wobble, c[2] * wobble];
}
