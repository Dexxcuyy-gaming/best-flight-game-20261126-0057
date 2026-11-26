// Sunset Isles — Island Hopper: the game loop and state machine.
// Wires the world, the plane, the missions, the HUD and the camera
// together. States: menu → flying → (landed / crashed / complete).
// ?shot=<rings|islands|runway|landing> skips the menu and flies the
// demo autopilot, so screenshots are real renders of the game flying.

import * as THREE from 'three';
import { MISSIONS, SHOTS } from './config.js';
import { createWorld } from './world.js';
import { buildPlaneMesh, FlightModel } from './plane.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { Missions } from './missions.js';
import { createEffects } from './effects.js';
import { createCamera } from './camera.js';
import { autopilotInput, runwayTarget } from './demo.js';

const params = new URLSearchParams(location.search);
const shotKey = params.get('shot');
const shot = shotKey ? SHOTS[shotKey] : null;

// ---- renderer / scene ------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 6000);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const world = createWorld(scene);
const planeMesh = buildPlaneMesh();
scene.add(planeMesh.group);
const plane = new FlightModel();
const input = createInput();
const hud = createHud();
const missions = new Missions();
const effects = createEffects(scene);
const chase = createCamera(camera);

// ---- state -----------------------------------------------------------------
let state = 'menu';           // menu | flying | crashed | failed | complete
let autopilot = false;
let paused = false;
let advanceTimer = 0;
let fuelWarned = false;
let shotTimer = 0;
let shotTarget = null;
const justPressed = new Set();

window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!e.repeat) justPressed.add(k);
});

function startMission(i) {
  const m = missions.start(i);
  world.setRings(m.rings, m.fuelRings);
  plane.reset(m.spawn);
  planeMesh.group.rotation.set(0, 0, 0);
  chase.snap(plane);
  hud.hideMenu();
  hud.hideBanner();
  hud.showBanner(`${m.name}<small>${m.intro}</small>`, 'info', 2.4);
  state = 'flying';
  autopilot = false;
  shotTarget = null;
  advanceTimer = 0;
  fuelWarned = false;
}

function applyShot(s) {
  startMission(s.mission);
  plane.reset({ ...s.place, onGround: !!s.place.onGround });
  if (s.skipRings) {
    for (let k = 0; k < s.skipRings && k < missions.rings.length; k++) {
      missions.rings[k].done = true;
      world.markRingDone(k);
    }
    missions.ringIndex = s.skipRings;
  }
  autopilot = true;
  shotTarget = s.targetPoint ?? null;
  chase.snap(plane);
  hud.hideMenu();
  hud.hideBanner();
  window.__shotReady = false;
  shotTimer = 0;
}

function doCrash(reason) {
  state = 'crashed';
  effects.crash(plane.pos);
  planeMesh.group.rotation.z = 0.9;
  hud.showBanner(`CRASHED<small>${reason} — press R to fly again</small>`, 'bad', 999);
}

function restart() {
  startMission(missions.missionIndex);
  if (shot) applyShot(shot);
}

document.querySelectorAll('#missionRow .btn').forEach((b) => {
  b.addEventListener('click', () => startMission(+b.dataset.mission));
});

// ---- per-frame ---------------------------------------------------------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // One-shot keys.
  if (justPressed.has('r') && state !== 'menu') restart();
  if (justPressed.has('p') && state === 'flying') {
    paused = !paused;
    hud.showBanner(paused ? 'PAUSED<small>Press P to resume</small>' : '', paused ? 'info' : 'info', paused ? 999 : 0.1);
    if (!paused) hud.hideBanner();
  }
  if (justPressed.has('m')) { state = 'menu'; hud.showMenu(); }
  if (justPressed.has('Enter') && state === 'menu') startMission(0);
  justPressed.clear();

  if (paused) { renderer.render(scene, camera); return; }

  if (state === 'flying') {
    // Steering: the player, or the demo autopilot for screenshots.
    let inp;
    if (autopilot) {
      let target, landing = false;
      if (shotTarget) target = shotTarget;
      else if (missions.landingPhase) { target = runwayTarget(); landing = true; }
      else {
        const ring = missions.nextRing();
        target = ring ? { x: ring.pos[0], y: ring.pos[1], z: ring.pos[2] }
          : { x: plane.pos.x + Math.sin(plane.yaw) * 200, y: 60, z: plane.pos.z + Math.cos(plane.yaw) * 200 };
      }
      inp = autopilotInput(plane, target, dt, landing);
    } else {
      inp = input.read();
    }

    const ev = plane.update(dt, inp);
    if (ev === 'landed') {
      const res = missions.onLanded();
      effects.dust(plane.pos);
      if (res === 'missionComplete') {
        hud.showBanner('LANDED — MISSION COMPLETE!<small>+500 pts</small>', 'good', 3);
        advanceTimer = 2.8;
      } else {
        hud.showBanner('LANDED!<small>Nice touchdown — throttle up to take off again</small>', 'good', 2.4);
      }
    } else if (ev === 'hard') {
      effects.dust(plane.pos);
      hud.showBanner(`HARD LANDING!<small>Damage +42 — total ${Math.round(plane.damage)}%</small>`, 'info', 2.2);
    } else if (ev === 'crashed') {
      const overSea = plane.pos.y <= 1.5;
      doCrash(overSea ? 'Ditched in the sea' : 'Hit the ground');
    }

    // Missions, rings, fuel, clock.
    for (const mev of missions.update(dt, plane)) {
      if (mev === 'ring') {
        const idx = missions.ringIndex - 1;
        world.markRingDone(idx);
        const r = missions.rings[idx];
        if (r) effects.burst(new THREE.Vector3(...r.pos), 0xffc93c, 22);
        hud.showBanner('RING +100', 'info', 1.1);
      } else if (mev === 'fuel') {
        effects.fuelPuff(plane.pos);
        for (const fr of world.fuelRings) {
          if (!fr.taken && fr.mesh.position.distanceTo(plane.pos) < 14) {
            fr.taken = true; fr.mesh.visible = false;
          }
        }
        hud.showBanner('FUEL +25', 'good', 1.2);
      } else if (mev === 'approachDone') {
        hud.showBanner('FINAL<small>Land on the runway — gently!</small>', 'info', 2.6);
      } else if (mev === 'missionComplete') {
        hud.showBanner('MISSION COMPLETE!<small>+500 pts</small>', 'good', 3);
        advanceTimer = 2.8;
      } else if (mev === 'timeUp') {
        state = 'failed';
        hud.showBanner('OUT OF TIME<small>Press R to retry the mission</small>', 'bad', 999);
      }
    }

    if (plane.fuel <= 0 && !fuelWarned) {
      fuelWarned = true;
      hud.showBanner('FUEL EMPTY — GLIDING!<small>Find a green fuel ring or land</small>', 'info', 3);
    }
    if (advanceTimer > 0) {
      advanceTimer -= dt;
      if (advanceTimer <= 0) {
        if (missions.missionIndex >= 2) {
          state = 'complete';
          hud.showBanner(`ALL MISSIONS COMPLETE!<small>Final score ${missions.score} — press R to fly again</small>`, 'good', 999);
        } else {
          startMission(missions.missionIndex + 1);
        }
      }
    }
    if (shot) {
      shotTimer += dt;
      if (shotTimer > 2.2) window.__shotReady = true;
    }

    // Sync the visible plane to the flight model.
    planeMesh.group.position.copy(plane.pos);
    planeMesh.group.rotation.order = 'YXZ';
    planeMesh.group.rotation.y = plane.yaw;
    planeMesh.group.rotation.x = -plane.pitch;
    planeMesh.group.rotation.z = -plane.roll;
    planeMesh.prop.rotation.z += (2 + plane.throttle * 28) * dt;

    // HUD.
    const ring = missions.nextRing();
    const dist = ring ? missions.distanceToNext(plane.pos) : null;
    hud.update({
      alt: plane.altitude(),
      spdKmh: plane.speedKmh(),
      heading: plane.headingDeg(),
      nextLabel: missions.landingPhase ? 'LAND ON THE RUNWAY'
        : dist !== null ? `NEXT RING ${Math.round(dist)}m`
        : missions.mission.id === 3 ? 'FREE FLY' : '',
      missionName: missions.mission.name,
      missionObj: plane.stalled ? 'STALL! Nose down to gain speed'
        : plane.fuel <= 0 ? 'OUT OF FUEL — gliding'
        : missions.objectiveText(),
      timerText: missions.timerText(),
      score: missions.score,
      fuel: plane.fuel,
      damage: plane.damage,
      throttle: plane.throttle,
      dt,
    });
  }

  world.update(dt, plane.pos, missions.ringIndex);
  effects.update(dt);
  if (state !== 'menu') chase.update(dt, plane, input.orbit(dt));
  renderer.render(scene, camera);
}

// ---- boot --------------------------------------------------------------------
if (shot) {
  applyShot(shot);
} else {
  // Menu backdrop: park her on the runway with the isles behind.
  plane.reset({ x: -110, y: 7.4, z: 60, yaw: Math.PI / 2, speed: 0, throttle: 0, onGround: true });
  planeMesh.group.position.copy(plane.pos);
  planeMesh.group.rotation.order = 'YXZ';
  planeMesh.group.rotation.y = plane.yaw;
  chase.snap(plane);
  world.setRings(MISSIONS[0].rings, MISSIONS[0].fuelRings);
}
window.__game = { plane, missions, startMission, get state() { return state; } };
requestAnimationFrame(frame);
