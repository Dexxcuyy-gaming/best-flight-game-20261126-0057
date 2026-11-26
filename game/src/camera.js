// Sunset Isles — Island Hopper: the chase camera.
// It sits behind and above the plane, follows her heading (never her
// roll), and eases into place — so it never fights the pilot. A mouse
// drag orbits it a little; it always drifts back behind the plane.

import * as THREE from 'three';

export function createCamera(camera) {
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const smoothedRoll = { v: 0 };

  return {
    update(dt, plane, orbit) {
      const speed = plane.speed;
      const dist = 15 + speed * 0.10;
      const height = 4.5 + speed * 0.03;
      // Camera base follows heading only (no pitch), so dives and climbs
      // don't whip it around.
      const fx = Math.sin(plane.yaw), fz = Math.cos(plane.yaw);
      // Mouse orbit: swing around the plane a little, then drift back.
      const ox = orbit ? orbit.x : 0;
      const oy = orbit ? orbit.y : 0;
      const bx = fx * Math.cos(ox) - fz * Math.sin(ox);
      const bz = fx * Math.sin(ox) + fz * Math.cos(ox);
      desired.set(
        plane.pos.x - bx * dist,
        plane.pos.y + height + oy * 10,
        plane.pos.z - bz * dist,
      );
      // Never let the camera sink into the ground or the sea.
      const ground = Math.max(0, plane.pos.y - 200);
      if (desired.y < ground + 2.5) desired.y = ground + 2.5;
      const k = 1 - Math.exp(-dt * 4.2);
      camera.position.lerp(desired, k);
      look.set(
        plane.pos.x + fx * 16,
        plane.pos.y + 1.2,
        plane.pos.z + fz * 16,
      );
      // Lean the horizon a touch with the bank — feel, not a fight.
      smoothedRoll.v += (plane.roll * 0.08 - smoothedRoll.v) * Math.min(1, dt * 3);
      up.set(Math.sin(smoothedRoll.v), Math.cos(smoothedRoll.v), 0);
      camera.up.copy(up);
      camera.lookAt(look);
    },
    snap(plane) {
      const fx = Math.sin(plane.yaw), fz = Math.cos(plane.yaw);
      camera.position.set(
        plane.pos.x - fx * 16,
        plane.pos.y + 5,
        plane.pos.z - fz * 16,
      );
      camera.up.set(0, 1, 0);
      camera.lookAt(plane.pos.x + fx * 16, plane.pos.y + 1, plane.pos.z + fz * 16);
    },
  };
}
