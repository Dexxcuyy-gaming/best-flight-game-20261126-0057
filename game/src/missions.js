// Sunset Isles — Island Hopper: missions, rings, fuel and score.
// A mission is a list of gold rings to thread in order (green rings
// refuel), then — for the landing mission — a touchdown on the strip.
// The mission object owns the clock and the score; it reports events and
// the main loop turns them into banners, particles and the next mission.

import { MISSIONS } from './config.js';

export class Missions {
  constructor() {
    this.score = 0;
    this.missionIndex = 0;
    this.ringIndex = 0;
    this.timeLeft = 0;
    this.done = false;
    this.failed = false;
    this.landingPhase = false;
    this.rings = [];
    this.fuelRings = [];
  }

  get mission() { return MISSIONS[this.missionIndex]; }

  start(index) {
    this.missionIndex = index;
    this.ringIndex = 0;
    this.done = false;
    this.failed = false;
    this.landingPhase = false;
    this.timeLeft = this.mission.timeLimit;
    this.rings = this.mission.rings.map((p) => ({ pos: p, done: false }));
    this.fuelRings = this.mission.fuelRings.map((p) => ({ pos: p, taken: false }));
    return this.mission;
  }

  // Next gold ring still to fly through (or null).
  nextRing() {
    return this.rings[this.ringIndex] ?? null;
  }

  distanceToNext(planePos) {
    const r = this.nextRing();
    if (!r) return null;
    const dx = r.pos[0] - planePos.x, dy = r.pos[1] - planePos.y, dz = r.pos[2] - planePos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Returns an array of event strings for this frame.
  update(dt, plane) {
    const events = [];
    if (this.done || this.failed) return events;
    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.failed = true;
        events.push('timeUp');
        return events;
      }
    }
    // Gold rings: generous 13 m radius so threading one feels fair.
    const ring = this.nextRing();
    if (ring) {
      const d = this.distanceToNext(plane.pos);
      if (d !== null && d < 13) {
        ring.done = true;
        this.ringIndex++;
        this.score += 100;
        events.push('ring');
        if (this.ringIndex >= this.rings.length) {
          if (this.mission.land) {
            this.landingPhase = true;
            events.push('approachDone');
          } else {
            this.complete(events);
          }
        }
      }
    }
    // Green fuel rings: +25 fuel, one use each.
    for (const f of this.fuelRings) {
      if (f.taken) continue;
      const dx = f.pos[0] - plane.pos.x, dy = f.pos[1] - plane.pos.y, dz = f.pos[2] - plane.pos.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 11) {
        f.taken = true;
        plane.fuel = Math.min(100, plane.fuel + 25);
        events.push('fuel');
      }
    }
    // Out of fuel over the sea with no speed left is a slow ditching, not
    // a mission fail — the crash handler reports it.
    return events;
  }

  // Called by the flight model when she touches down on the strip.
  onLanded() {
    if (this.done || this.failed) return null;
    if (this.mission.land && (this.landingPhase || this.rings.length === 0)) {
      this.complete([]);
      return 'missionComplete';
    }
    return null;
  }

  complete(events) {
    this.done = true;
    const bonus = this.timeLeft > 0 ? Math.round(this.timeLeft) * 2 : 0;
    this.score += 500 + bonus;
    events.push('missionComplete');
  }

  objectiveText() {
    if (this.done) return 'Mission complete!';
    if (this.failed) return 'Out of time — press R to retry';
    if (this.landingPhase) return 'Land on the runway — gently!';
    const ring = this.nextRing();
    if (ring) return `Fly through ring ${this.ringIndex + 1} of ${this.rings.length}`;
    if (this.mission.land) return 'Land on the runway — gently!';
    return this.mission.intro;
  }

  timerText() {
    if (this.timeLeft <= 0) return '';
    const t = Math.max(0, Math.ceil(this.timeLeft));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }
}
