// Sunset Isles — Island Hopper: short-lived particles.
// A pool of soft sprites (one canvas-generated radial texture, no files):
// gold bursts when a ring is threaded, green puffs at fuel rings, grey
// smoke and orange fire when she crashes, dust on a hard touchdown.

import * as THREE from 'three';

function softTexture() {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export function createEffects(scene) {
  const tex = softTexture();
  const pool = [];
  for (let i = 0; i < 64; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.visible = false;
    scene.add(s);
    pool.push({ sprite: s, vel: new THREE.Vector3(), life: 0, maxLife: 1, grow: 0, rise: 0 });
  }
  let cursor = 0;

  function spawn(pos, colour, count, opt) {
    for (let n = 0; n < count; n++) {
      const p = pool[cursor];
      cursor = (cursor + 1) % pool.length;
      p.sprite.visible = true;
      p.sprite.position.copy(pos);
      p.sprite.position.x += (Math.random() - 0.5) * (opt.spread ?? 2);
      p.sprite.position.y += (Math.random() - 0.5) * (opt.spread ?? 2);
      p.sprite.position.z += (Math.random() - 0.5) * (opt.spread ?? 2);
      p.sprite.material.color.setHex(colour);
      p.sprite.material.rotation = Math.random() * Math.PI * 2;
      const size = (opt.size ?? 3) * (0.7 + Math.random() * 0.6);
      p.sprite.scale.setScalar(size);
      p.vel.set((Math.random() - 0.5) * (opt.speed ?? 8), (Math.random() - 0.2) * (opt.speed ?? 8), (Math.random() - 0.5) * (opt.speed ?? 8));
      p.life = p.maxLife = (opt.life ?? 1.2) * (0.7 + Math.random() * 0.6);
      p.grow = opt.grow ?? 1.5;
      p.rise = opt.rise ?? 0;
    }
  }

  return {
    burst(pos, colour = 0xffc93c, count = 18) {
      spawn(pos, colour, count, { size: 3.2, speed: 10, life: 0.9, spread: 3, grow: 0.6 });
    },
    fuelPuff(pos) {
      spawn(pos, 0x2ecc71, 14, { size: 3.5, speed: 6, life: 1.0, spread: 2, grow: 1.2 });
    },
    dust(pos) {
      spawn(pos, 0xd8c9a8, 12, { size: 2.5, speed: 5, life: 0.8, spread: 4, grow: 2.0 });
    },
    crash(pos) {
      spawn(pos, 0x3a3a3a, 26, { size: 5, speed: 9, life: 2.2, spread: 3, grow: 3.2, rise: 6 });
      spawn(pos, 0xff7a1a, 18, { size: 4, speed: 12, life: 1.1, spread: 3, grow: 1.0 });
      spawn(pos, 0xffd94d, 10, { size: 3, speed: 14, life: 0.7, spread: 2, grow: 0.5 });
    },
    update(dt) {
      for (const p of pool) {
        if (!p.sprite.visible) continue;
        p.life -= dt;
        if (p.life <= 0) { p.sprite.visible = false; p.sprite.material.opacity = 0; continue; }
        p.sprite.position.x += p.vel.x * dt;
        p.sprite.position.y += (p.vel.y + p.rise) * dt;
        p.sprite.position.z += p.vel.z * dt;
        p.vel.multiplyScalar(Math.max(0, 1 - dt * 1.8));
        const k = p.life / p.maxLife;
        p.sprite.material.opacity = Math.min(0.95, k * 1.4);
        p.sprite.scale.multiplyScalar(1 + p.grow * dt);
      }
    },
  };
}
