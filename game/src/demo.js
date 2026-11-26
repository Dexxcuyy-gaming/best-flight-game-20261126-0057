// Sunset Isles — Island Hopper: the demo autopilot.
// It flies the plane toward a target the way a calm pilot would: bank
// gently into the heading error, pitch for the target altitude, ease the
// throttle. It powers the ?shot= presets, so every screenshot is a real
// render of the game actually flying — never a posed still.

import { RUNWAY, PLANE } from './config.js';

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function autopilotInput(plane, target, dt, landing = false) {
  const dx = target.x - plane.pos.x;
  const dy = target.y - plane.pos.y;
  const dz = target.z - plane.pos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const wantYaw = Math.atan2(dx, dz);
  const err = wrapAngle(wantYaw - plane.yaw);
  // Bank gently into the heading error — never more than a moderate bank,
  // so the horizon stays level and the shot reads as a chase view.
  const roll = clamp(err * 1.2, -0.6, 0.6);
  // Pitch for the target height; on final, hold a gentle descent.
  // The flight model follows the stick directly, so command the angle.
  let wantPitch;
  if (landing && dist < 260) {
    wantPitch = clamp((dy - 4) * 0.012, -0.28, 0.1);
  } else {
    wantPitch = clamp(dy * 0.014, -0.4, 0.4);
  }
  const pitch = clamp(wantPitch / PLANE.maxPitch, -0.9, 0.9);
  // Throttle: cruise, slower on final so the landing reads.
  let throttle = 0;
  if (landing && dist < 200) throttle = plane.speed > 40 ? -0.6 : 0.15;
  else throttle = plane.speed < 46 ? 0.5 : (plane.speed > 58 ? -0.4 : 0);
  return { pitch, roll, throttle, dist };
}

// The runway threshold, for the landing approach.
export function runwayTarget() {
  return { x: RUNWAY.cx - RUNWAY.halfLength + 20, y: 8, z: RUNWAY.cz };
}
