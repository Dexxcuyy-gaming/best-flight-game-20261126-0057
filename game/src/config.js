// Sunset Isles — Island Hopper: every tunable number in one place.
// Units are metres, seconds and radians unless a name says otherwise.

export const WORLD = {
  size: 2600,          // terrain plane spans -1300..1300 on x and z
  seaLevel: 0,
  runwayHeight: 6,     // flattened strip elevation
  fogNear: 700,
  fogFar: 2400,
};

export const RUNWAY = {
  cx: 0, cz: 60,       // centre of the strip
  halfLength: 130,     // along x (east-west)
  halfWidth: 13,       // along z
  heading: Math.PI / 2, // landing heading: east (+x) = 090 degrees
  blend: 70,           // metres over which the terrain flattens onto the strip
};

// Islands: centre, radius, peak height. The height function in terrain.js
// domes each one with a cosine falloff; the runway flatten cuts a plateau
// into the main island near its southern shore.
export const ISLANDS = [
  { cx: 0,    cz: -260, r: 380, peak: 55, name: 'Coral Isle' },   // main island
  { cx: -540, cz: -440, r: 230, peak: 32, name: 'Palm Cay' },
  { cx: 500,  cz: -400, r: 190, peak: 40, name: 'Turtle Rock' },
  { cx: 170,  cz: 430,  r: 95,  peak: 5,  name: 'Sandbar' },
  { cx: -420, cz: 480,  r: 130, peak: 12, name: 'Gull Rock' },
];

export const PLANE = {
  minSpeed: 20,        // m/s — below this she stalls and sinks
  maxSpeed: 72,        // m/s at full throttle (~260 km/h)
  cruiseSpeed: 46,
  maxPitch: 0.55,
  maxRoll: 1.1,
  turnRate: 0.62,      // yaw rad/s per rad of bank, scaled by speed
  fuelDrain: 0.30,     // %/s at full throttle
  fuelStart: 100,
  stallSink: 9,        // extra m/s sink when stalled
  groundClearance: 1.3,
  landMaxSpeed: 38,    // m/s — faster than this on touchdown is a hard landing
  landMaxSink: 6,      // m/s descent — steeper is a hard landing
  hardDamage: 42,      // damage from one hard landing
};

export const COLOURS = {
  skyTop: 0x4aa8e8,
  skyHorizon: 0xd8f1fd,
  sea: 0x18b3d6,
  seaDeep: 0x0d7fa8,
  sand: 0xf2d8a0,
  grass: 0x58b368,
  grassDark: 0x3f9a52,
  rock: 0x8a7f72,
  runway: 0x3c4147,
  runwayLine: 0xffffff,
  planeRed: 0xe23b3b,
  planeWhite: 0xf8f8f2,
  planeYellow: 0xffc93c,
  ringGold: 0xffc93c,
  ringFuel: 0x2ecc71,
  cloud: 0xffffff,
};

// Rings are [x, y, z]. Facing is computed from the course direction.
export const MISSIONS = [
  {
    id: 0, name: 'RING RUN', short: 'Ring Run',
    intro: 'Fly through ring 1 of 6',
    timeLimit: 0, // no clock — learn the sky
    rings: [
      [70, 42, 250], [-30, 48, 330], [-130, 44, 300],
      [-190, 52, 180], [-130, 46, 60], [-20, 42, -10],
    ],
    fuelRings: [],
    spawn: { x: 0, y: 40, z: 120, yaw: 0.35, speed: 42, throttle: 0.6 },
  },
  {
    id: 1, name: 'ISLAND DASH', short: 'Island Dash',
    intro: 'Ring 1 of 8 — beat the clock!',
    timeLimit: 150,
    rings: [
      [120, 45, 300], [-160, 50, 380], [-420, 48, 120], [-480, 55, -260],
      [-200, 50, -480], [180, 48, -460], [430, 52, -220], [260, 45, 120],
    ],
    fuelRings: [[-300, 48, 250], [0, 50, -480], [340, 48, -40]],
    spawn: { x: 0, y: 40, z: 120, yaw: 0.35, speed: 42, throttle: 0.6 },
  },
  {
    id: 2, name: 'RUNWAY LANDING', short: 'Runway Landing',
    intro: 'Through the gates, then land on the strip',
    timeLimit: 150,
    rings: [[-340, 46, 60], [-190, 24, 60]],
    fuelRings: [],
    spawn: { x: -620, y: 90, z: 60, yaw: Math.PI / 2, speed: 48, throttle: 0.55 },
    land: true,
  },
  {
    id: 3, name: 'FREE FLY', short: 'Free Fly',
    intro: 'No objectives — just fly the isles',
    timeLimit: 0,
    rings: [],
    fuelRings: [[-300, 48, 250], [0, 50, -480], [340, 48, -40], [120, 45, 300]],
    spawn: { x: 0, y: 60, z: 120, yaw: 0.35, speed: 46, throttle: 0.6 },
  },
];

export const SHOTS = {
  // Demo/autopilot presets for screenshots: ?shot=<key>
  // place: where she starts; skipRings: rings already threaded;
  // targetPoint: fly straight at this instead of the next ring.
  rings:    { mission: 0, place: { x: 10, y: 45, z: 480, yaw: -2.88, speed: 52, throttle: 0.7 }, skipRings: 1 },
  islands:  { mission: 1, place: { x: -20, y: 75, z: 220, yaw: 1.05, speed: 50, throttle: 0.65 }, skipRings: 0 },
  runway:   { mission: 0, place: { x: -110, y: 7.4, z: 60, yaw: Math.PI / 2, speed: 0, throttle: 1, onGround: true }, skipRings: 0, targetPoint: { x: 300, y: 30, z: 60 } },
  landing:  { mission: 2, place: { x: -420, y: 40, z: 60, yaw: Math.PI / 2, speed: 42, throttle: 0.45 }, skipRings: 0 },
};
