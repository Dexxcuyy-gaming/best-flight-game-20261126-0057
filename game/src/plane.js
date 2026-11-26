// Sunset Isles — Island Hopper: the aircraft and how she flies.
// A little red prop plane built from three.js primitives, plus an arcade
// flight model: throttle sets speed, banking turns her, pitch climbs and
// dives, too slow and she stalls. Ground and water contact is judged here:
// a gentle touchdown on the runway is a landing, anything else is a crash.

import * as THREE from 'three';
import { PLANE, RUNWAY, COLOURS } from './config.js';
import { terrainHeight, isSea, onRunway } from './terrain.js';

export function buildPlaneMesh() {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: COLOURS.planeRed });
  const white = new THREE.MeshLambertMaterial({ color: COLOURS.planeWhite });
  const dark = new THREE.MeshLambertMaterial({ color: 0x22303c });
  const yellow = new THREE.MeshLambertMaterial({ color: COLOURS.planeYellow });

  // Fuselage: a stretched sphere, red with a white belly stripe.
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 12), red);
  body.scale.set(1, 0.95, 3.1);
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.05, 18, 12), white);
  belly.scale.set(0.82, 0.5, 2.9);
  belly.position.y = -0.42;
  g.add(belly);
  // Nose cone + spinner.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 14), red);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 3.9;
  g.add(nose);
  // Canopy: dark glass bubble.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 10), dark);
  canopy.scale.set(0.9, 0.75, 1.5);
  canopy.position.set(0, 0.85, 0.9);
  g.add(canopy);
  // Main wings, white with red tips.
  const wingGeo = new THREE.BoxGeometry(4.6, 0.22, 1.5);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, white);
    wing.position.set(s * 2.5, -0.1, 0.4);
    g.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 1.5), red);
    tip.position.set(s * 5.2, -0.1, 0.4);
    g.add(tip);
  }
  // Tail: horizontal stabiliser + fin.
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.0), white);
  tail.position.set(0, 0.25, -3.1);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 1.2), red);
  fin.position.set(0, 0.85, -3.1);
  g.add(fin);
  // Propeller: two blades + yellow hub, spins with throttle.
  const prop = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.12), dark);
    blade.rotation.z = a;
    prop.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), yellow);
  prop.add(hub);
  prop.position.z = 4.8;
  g.add(prop);
  // Landing gear: two wheels + struts (visible on approach and rollout).
  for (const s of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    strut.position.set(s * 0.85, -1.15, 1.2);
    g.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 0.85, -1.7, 1.2);
    g.add(wheel);
  }
  // Wingtip navigation lights.
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  navL.position.set(-5.6, -0.1, 0.4);
  g.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x20ff40 }));
  navR.position.set(5.6, -0.1, 0.4);
  g.add(navR);

  return { group: g, prop };
}

// The flight model. All speeds in m/s, angles in radians.
// forward = (sin yaw * cos pitch, sin pitch, cos yaw * cos pitch).
export class FlightModel {
  constructor() {
    this.reset({ x: 0, y: 40, z: 120, yaw: 0.35, speed: 42, throttle: 0.6 });
  }

  reset(spawn) {
    this.pos = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
    this.yaw = spawn.yaw;
    this.pitch = 0;
    this.roll = 0;
    this.speed = spawn.speed;
    this.throttle = spawn.throttle;
    this.fuel = PLANE.fuelStart;
    this.damage = 0;
    this.onGround = !!spawn.onGround;
    this.verticalSpeed = 0;
    this.stalled = false;
    this.time = 0;
  }

  // input: { pitch: -1..1 (up positive), roll: -1..1 (right positive),
  //          throttle: -1..1 } — returns an event string or ''.
  update(dt, input) {
    this.time += dt;

    // Throttle: 0..1, fuel forces it to 0 when the tank is dry.
    if (this.fuel > 0) {
      this.throttle = Math.max(0, Math.min(1, this.throttle + input.throttle * dt * 0.9));
    } else {
      this.throttle = 0;
    }
    this.fuel = Math.max(0, this.fuel - this.throttle * PLANE.fuelDrain * dt);

    // Bank and pitch follow the stick directly and ease back to level when
    // released, so she is stable and never runs away into a steep bank.
    // A held stick holds a bank; letting go levels her out.
    const targetPitch = input.pitch * PLANE.maxPitch;
    const targetRoll = input.roll * PLANE.maxRoll;
    const pk = 1 - Math.exp(-dt * 3.0);
    const rk = 1 - Math.exp(-dt * 3.5);
    this.pitch += (targetPitch - this.pitch) * pk;
    this.roll += (targetRoll - this.roll) * rk;

    // Banked turn: heading follows the bank, faster when she is fast.
    this.yaw -= this.roll * PLANE.turnRate * (this.speed / PLANE.cruiseSpeed) * dt;

    // Speed chases the throttle, climbing costs speed and diving gains it.
    const target = PLANE.minSpeed + this.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    this.speed += (target - this.speed) * 0.55 * dt;
    this.speed -= Math.sin(this.pitch) * 6 * dt;
    this.speed = Math.max(8, this.speed);

    // Stall: too slow and she sinks no matter the pitch.
    this.stalled = this.speed < 24 && !this.onGround;
    let vy = this.speed * Math.sin(this.pitch);
    if (this.stalled) vy -= PLANE.stallSink;

    const cp = Math.cos(this.pitch);
    const fx = Math.sin(this.yaw) * cp, fy = Math.sin(this.pitch), fz = Math.cos(this.yaw) * cp;
    this.pos.x += fx * this.speed * dt;
    this.pos.y += vy * dt;
    this.pos.z += fz * this.speed * dt;
    this.verticalSpeed = vy;

    // Keep her inside the map; the sea is wide, so just turn her gently.
    const R = 1250;
    const rr = Math.hypot(this.pos.x, this.pos.z);
    if (rr > R) {
      const push = (rr - R) / R;
      this.yaw += (this.pos.x > 0 ? -1 : 1) * push * dt * 2;
      this.pos.x *= 1 - push * dt * 0.5;
      this.pos.z *= 1 - push * dt * 0.5;
    }
    if (this.pos.y > 420) { this.pos.y = 420; this.pitch = Math.min(this.pitch, 0); }

    // Lift-off: rolling fast on the strip with the nose up, she flies again.
    if (this.onGround && this.speed > 30 && input.pitch > 0.2) {
      this.onGround = false;
    }

    // ---- ground / water contact -------------------------------------------
    const ground = Math.max(terrainHeight(this.pos.x, this.pos.z), 0);
    const clearance = this.pos.y - ground;
    if (clearance <= PLANE.groundClearance) {
      this.pos.y = ground + PLANE.groundClearance;
      if (this.onGround) {
        // Already rolling: stay planted; speed bleeds off below.
      } else {
        const overStrip = onRunway(this.pos.x, this.pos.z);
        const gentle = this.speed <= PLANE.landMaxSpeed
          && vy >= -PLANE.landMaxSink && Math.abs(this.pitch) < 0.3;
        if (overStrip && gentle) {
          this.onGround = true;
          this.pitch = 0; this.roll = 0;
          this.speed = Math.max(0, this.speed - 14 * dt);
          return 'landed';
        }
        if (overStrip) {
          // Hard touchdown on the strip: damage, bounce back up, keep flying.
          this.damage += PLANE.hardDamage;
          this.pos.y = ground + 6;
          this.pitch = 0.18;
          this.speed *= 0.75;
          if (this.damage >= 100) return 'crashed';
          return 'hard';
        }
        // Water or rough ground: she is lost.
        this.onGround = true;
        return 'crashed';
      }
    }
    // Rolling on the strip after a landing: bleed speed, stay planted.
    if (this.onGround) {
      this.speed = Math.max(0, this.speed - 10 * dt);
      if (this.speed < 2) this.speed = 0;
    }
    return '';
  }

  headingDeg() {
    return ((this.yaw * 180 / Math.PI) % 360 + 360) % 360;
  }

  speedKmh() {
    return this.speed * 3.6;
  }

  altitude() {
    return Math.max(0, this.pos.y - Math.max(terrainHeight(this.pos.x, this.pos.z), 0));
  }
}
