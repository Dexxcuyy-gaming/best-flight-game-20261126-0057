// Sunset Isles — Island Hopper: builds everything you see.
// Sky dome, turquoise sea, the island terrain, runway + tower, palms,
// clouds, rings and the sun. The terrain mesh and the collision height in
// terrain.js come from the same function, so the ground you see is the
// ground you can hit.

import * as THREE from 'three';
import { WORLD, RUNWAY, ISLANDS, COLOURS, MISSIONS } from './config.js';
import { terrainHeight, terrainColour, onRunway } from './terrain.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(scene) {
  const api = { rings: [], fuelRings: [], clouds: [], beacon: null, shadow: null };
  const clock = { t: 0 };

  // ---- lights & sky -------------------------------------------------------
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.7);
  sun.position.set(400, 700, 300);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0xe8d8a8, 1.0));
  scene.fog = new THREE.Fog(0xcfeefb, WORLD.fogNear, WORLD.fogFar);

  const skyGeo = new THREE.SphereGeometry(2800, 24, 16);
  const skyPos = skyGeo.attributes.position;
  const skyCol = new Float32Array(skyPos.count * 3);
  const top = new THREE.Color(COLOURS.skyTop), hor = new THREE.Color(COLOURS.skyHorizon);
  const c = new THREE.Color();
  for (let i = 0; i < skyPos.count; i++) {
    const y = skyPos.getY(i) / 2800; // -1..1
    c.copy(hor).lerp(top, Math.max(0, Math.min(1, y * 1.4 + 0.25)));
    skyCol[i * 3] = c.r; skyCol[i * 3 + 1] = c.g; skyCol[i * 3 + 2] = c.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(sky);

  // Sun disc high in the sky.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(70, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff7c0, fog: false }),
  );
  sunDisc.position.set(900, 900, -1400);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  // ---- sea ----------------------------------------------------------------
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(1700, 64),
    new THREE.MeshLambertMaterial({ color: COLOURS.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.15;
  scene.add(sea);
  // A deeper-blue outer disc so the horizon reads as open ocean.
  const deep = new THREE.Mesh(
    new THREE.RingGeometry(1700, 2700, 48),
    new THREE.MeshLambertMaterial({ color: COLOURS.seaDeep }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = 0.1;
  scene.add(deep);

  // White foam rings where the islands meet the water.
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  for (const isl of ISLANDS) {
    const foam = new THREE.Mesh(new THREE.RingGeometry(isl.r * 0.97, isl.r * 1.07, 48), foamMat);
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(isl.cx, 0.35, isl.cz);
    scene.add(foam);
  }

  // ---- terrain ------------------------------------------------------------
  const SEG = 130;
  const tg = new THREE.PlaneGeometry(WORLD.size, WORLD.size, SEG, SEG);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const col = terrainColour(x, z, h);
    cols[i * 3] = col[0]; cols[i * 3 + 1] = col[1]; cols[i * 3 + 2] = col[2];
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(terrain);

  // ---- runway -------------------------------------------------------------
  const rw = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.halfLength * 2, 0.8, RUNWAY.halfWidth * 2),
    new THREE.MeshLambertMaterial({ color: COLOURS.runway }),
  );
  strip.position.y = WORLD.runwayHeight + 0.1;
  rw.add(strip);
  // Centreline dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: COLOURS.runwayLine });
  for (let x = -RUNWAY.halfLength + 15; x < RUNWAY.halfLength - 10; x += 22) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(11, 0.15, 1.6), dashMat);
    dash.position.set(x, WORLD.runwayHeight + 0.55, 0);
    rw.add(dash);
  }
  // Threshold stripes at both ends.
  for (const sx of [-1, 1]) {
    for (let k = -2; k <= 2; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(9, 0.15, 2.2), dashMat);
      bar.position.set(sx * (RUNWAY.halfLength - 8), WORLD.runwayHeight + 0.55, k * 4.4);
      rw.add(bar);
    }
  }
  // Edge lights: little amber posts along both sides.
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffd94d });
  for (let x = -RUNWAY.halfLength + 8; x <= RUNWAY.halfLength - 8; x += 26) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), edgeMat);
      post.position.set(x, WORLD.runwayHeight + 1.1, sz * (RUNWAY.halfWidth + 1.5));
      rw.add(post);
    }
  }
  rw.position.set(RUNWAY.cx, 0, RUNWAY.cz);
  scene.add(rw);

  // Control tower beside the strip.
  const tower = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 22, 10),
    new THREE.MeshLambertMaterial({ color: 0xf8f8f2 }));
  shaft.position.y = 11;
  tower.add(shaft);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 11),
    new THREE.MeshLambertMaterial({ color: 0x2b6cb0 }));
  cab.position.y = 24;
  tower.add(cab);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 3.5, 4),
    new THREE.MeshLambertMaterial({ color: COLOURS.planeRed }));
  roof.position.y = 28.5;
  roof.rotation.y = Math.PI / 4;
  tower.add(roof);
  tower.position.set(150, terrainHeight(150, 28), 28);
  scene.add(tower);

  // Windsock near the threshold.
  const sock = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9, 6),
    new THREE.MeshLambertMaterial({ color: 0xffffff }));
  pole.position.y = 4.5;
  sock.add(pole);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 10),
    new THREE.MeshLambertMaterial({ color: 0xff7a1a }));
  cone.rotation.z = -Math.PI / 2;
  cone.position.set(2.4, 8.4, 0);
  sock.add(cone);
  sock.position.set(-140, terrainHeight(-140, 44), 44);
  scene.add(sock);

  // ---- palms on the beaches ----------------------------------------------
  const rng = mulberry32(20261126);
  const spots = [];
  let guard = 0;
  while (spots.length < 26 && guard++ < 4000) {
    const a = rng() * Math.PI * 2, r = rng();
    const isl = ISLANDS[Math.floor(rng() * 3)]; // main three islands only
    const x = isl.cx + Math.cos(a) * isl.r * (0.55 + rng() * 0.42);
    const z = isl.cz + Math.sin(a) * isl.r * (0.55 + rng() * 0.42);
    const h = terrainHeight(x, z);
    if (h > 1.0 && h < 4.5 && !onRunway(x, z) && Math.abs(x - 150) > 18) spots.push([x, h, z]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.55, 7, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
  const frondGeo = new THREE.BoxGeometry(0.7, 0.12, 4.6);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2fae4e });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, spots.length * 5);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  spots.forEach(([x, h, z], i) => {
    const lean = (rng() - 0.5) * 0.35;
    e.set(0, 0, lean); q.setFromEuler(e);
    m4.compose(v.set(x, h + 3.4, z), q, s); trunks.setMatrixAt(i, m4);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rng() * 0.5;
      const fx = x + Math.cos(a) * 1.9, fz = z + Math.sin(a) * 1.9;
      e.set(0.5, -a, 0, 'YXZ'); q.setFromEuler(e);
      m4.compose(v.set(fx, h + 7.0, fz), q, s);
      fronds.setMatrixAt(i * 5 + k, m4);
    }
  });
  scene.add(trunks); scene.add(fronds);

  // ---- clouds -------------------------------------------------------------
  const cloudMat = new THREE.MeshLambertMaterial({ color: COLOURS.cloud });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(9 + rng() * 9, 10, 8), cloudMat);
      puff.position.set((k - n / 2) * 12 + rng() * 6, rng() * 3, rng() * 8 - 4);
      puff.scale.y = 0.45;
      g.add(puff);
    }
    g.position.set(-1200 + rng() * 2400, 150 + rng() * 110, -1100 + rng() * 2200);
    g.userData.drift = 1.5 + rng() * 2.5;
    scene.add(g);
    api.clouds.push(g);
  }

  // ---- blob shadow under the plane ----------------------------------------
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  api.shadow = shadow;

  // ---- rings --------------------------------------------------------------
  const ringGeo = new THREE.TorusGeometry(13, 1.15, 12, 40);
  const fuelGeo = new THREE.TorusGeometry(10, 1.0, 12, 36);
  const goldMat = new THREE.MeshLambertMaterial({ color: COLOURS.ringGold, emissive: 0x8a6d00 });
  const fuelMat = new THREE.MeshLambertMaterial({ color: COLOURS.ringFuel, emissive: 0x0d5c26 });
  const doneMat = new THREE.MeshLambertMaterial({ color: 0x9be29b, emissive: 0x1d4d1d, transparent: true, opacity: 0.45 });

  api.setRings = (ringDefs, fuelDefs) => {
    for (const r of [...api.rings, ...api.fuelRings]) scene.remove(r.mesh);
    api.rings = []; api.fuelRings = [];
    if (api.beacon) { scene.remove(api.beacon); api.beacon = null; }
    const face = (mesh, from, to) => { mesh.position.set(...from); mesh.lookAt(to[0], to[1], to[2]); };
    ringDefs.forEach((p, i) => {
      const mesh = new THREE.Mesh(ringGeo, goldMat.clone());
      const next = ringDefs[Math.min(i + 1, ringDefs.length - 1)];
      const prev = ringDefs[Math.max(i - 1, 0)];
      face(mesh, p, next);
      mesh.userData.base = p;
      scene.add(mesh);
      api.rings.push({ mesh, pos: p, done: false });
    });
    fuelDefs.forEach((p) => {
      const mesh = new THREE.Mesh(fuelGeo, fuelMat.clone());
      mesh.position.set(...p);
      mesh.rotation.y = Math.PI / 2;
      scene.add(mesh);
      api.fuelRings.push({ mesh, pos: p, taken: false });
    });
    // Beacon column over the next ring, so the pilot always sees the goal.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 160, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    scene.add(beam);
    api.beacon = beam;
  };

  api.markRingDone = (i) => {
    const r = api.rings[i];
    if (!r) return;
    r.done = true;
    r.mesh.material = doneMat;
  };

  api.update = (dt, planePos, nextRingIndex) => {
    clock.t += dt;
    for (const cl of api.clouds) {
      cl.position.x += cl.userData.drift * dt;
      if (cl.position.x > 1350) cl.position.x = -1350;
    }
    api.rings.forEach((r, i) => {
      if (r.done) return;
      const pulse = 1 + 0.09 * Math.sin(clock.t * 3 + i);
      r.mesh.scale.setScalar(i === nextRingIndex ? pulse * 1.08 : pulse);
      r.mesh.rotation.z += dt * 0.25;
    });
    api.fuelRings.forEach((r, i) => {
      if (r.taken) return;
      r.mesh.rotation.y += dt * 0.6;
      r.mesh.position.y = r.pos[1] + Math.sin(clock.t * 2 + i * 1.7) * 1.5;
    });
    if (api.beacon) {
      const target = api.rings[nextRingIndex];
      if (target && !target.done) {
        api.beacon.visible = true;
        api.beacon.position.set(target.pos[0], target.pos[1] + 80, target.pos[2]);
      } else api.beacon.visible = false;
    }
    // Blob shadow tracks the plane over the ground or sea below it.
    if (planePos) {
      const g = Math.max(terrainHeight(planePos.x, planePos.z), 0);
      const alt = Math.max(0, planePos.y - g);
      api.shadow.position.set(planePos.x, g + 0.3, planePos.z);
      const sc = Math.max(0.4, Math.min(1.6, 1.6 - alt / 160));
      api.shadow.scale.setScalar(sc);
      api.shadow.material.opacity = Math.max(0.05, 0.28 - alt / 900);
    }
  };

  return api;
}
