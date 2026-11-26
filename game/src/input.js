// Sunset Isles — Island Hopper: keyboard + mouse input.
// Arrows (or WASD) fly her, Shift/Ctrl work the throttle, R restarts,
// P pauses. Dragging the mouse orbits the chase camera a little; the
// camera always eases back behind the plane.

export function createInput() {
  const keys = new Set();
  const orbit = { x: 0, y: 0 };
  let dragging = false;
  let lastX = 0, lastY = 0;

  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  };
  const up = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  window.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    orbit.x += (e.clientX - lastX) * 0.004;
    orbit.y += (e.clientY - lastY) * 0.003;
    orbit.y = Math.max(-0.5, Math.min(0.5, orbit.y));
    lastX = e.clientX; lastY = e.clientY;
  });

  return {
    // -1..1 each: pitch up positive, roll right positive, throttle up positive.
    read() {
      const pitch = ((keys.has('ArrowUp') || keys.has('w')) ? 1 : 0)
        + ((keys.has('ArrowDown') || keys.has('s')) ? -1 : 0);
      const roll = ((keys.has('ArrowRight') || keys.has('d')) ? 1 : 0)
        + ((keys.has('ArrowLeft') || keys.has('a')) ? -1 : 0);
      const throttle = ((keys.has('Shift')) ? 1 : 0)
        + ((keys.has('Control')) ? -1 : 0);
      return { pitch, roll, throttle };
    },
    pressed(key) {
      return keys.has(key);
    },
    // Camera orbit offset (radians); eases back to zero when not dragging.
    orbit(dt) {
      if (!dragging) {
        orbit.x *= Math.max(0, 1 - dt * 1.5);
        orbit.y *= Math.max(0, 1 - dt * 1.5);
      }
      return orbit;
    },
  };
}
