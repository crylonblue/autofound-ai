/**
 * Collision detection for office characters.
 * Characters walk in straight lines; collisions with furniture
 * are resolved by pushing the character out of obstacles.
 */

const AGENT_RADIUS = 0.3;

interface Obstacle {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
}

const obstacles: Obstacle[] = [];

// ─── Obstacle registration ─────────────────────────────────────────

function addObstacle(
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  padding = 0.15
) {
  obstacles.push({
    cx,
    cz,
    halfW: halfW + padding,
    halfD: halfD + padding,
  });
}

function addObstacleRotated(
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  rotation: number,
  padding = 0.15
) {
  // For rotated obstacles, use the bounding circle as an AABB
  const r = Math.sqrt(halfW * halfW + halfD * halfD);
  addObstacle(cx, cz, r, r, padding);
}

// ─── Collision resolution ───────────────────────────────────────────

/** Resolve circle-vs-AABB overlap. Returns corrected [x, z]. */
function resolveCircleAABB(
  x: number,
  z: number,
  radius: number,
  obs: Obstacle
): [number, number] {
  // Find closest point on AABB to circle center
  const closestX = Math.max(obs.cx - obs.halfW, Math.min(x, obs.cx + obs.halfW));
  const closestZ = Math.max(obs.cz - obs.halfD, Math.min(z, obs.cz + obs.halfD));

  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) {
    return [x, z]; // No collision
  }

  if (distSq < 0.0001) {
    // Center is inside AABB — push out via shortest axis
    const overlapLeft = x - (obs.cx - obs.halfW);
    const overlapRight = (obs.cx + obs.halfW) - x;
    const overlapTop = z - (obs.cz - obs.halfD);
    const overlapBottom = (obs.cz + obs.halfD) - z;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) return [obs.cx - obs.halfW - radius, z];
    if (minOverlap === overlapRight) return [obs.cx + obs.halfW + radius, z];
    if (minOverlap === overlapTop) return [x, obs.cz - obs.halfD - radius];
    return [x, obs.cz + obs.halfD + radius];
  }

  // Push circle out along the vector from closest point to center
  const dist = Math.sqrt(distSq);
  const pushDist = radius - dist;
  return [x + (dx / dist) * pushDist, z + (dz / dist) * pushDist];
}

/**
 * Given a desired position, resolve all collisions and return
 * the corrected position. Characters slide along obstacle edges.
 */
export function resolveCollisions(x: number, z: number): [number, number] {
  let rx = x;
  let rz = z;

  // Multiple iterations handle corner cases where pushing out of
  // one obstacle pushes into another
  for (let iter = 0; iter < 3; iter++) {
    let pushed = false;
    for (const obs of obstacles) {
      const [nx, nz] = resolveCircleAABB(rx, rz, AGENT_RADIUS, obs);
      if (nx !== rx || nz !== rz) {
        rx = nx;
        rz = nz;
        pushed = true;
      }
    }
    if (!pushed) break;
  }

  return [rx, rz];
}

/** Check if a position is clear of all obstacles. */
export function isWalkable(x: number, z: number): boolean {
  const [rx, rz] = resolveCollisions(x, z);
  return Math.abs(rx - x) < 0.001 && Math.abs(rz - z) < 0.001;
}

// ─── Initialize furniture obstacles ─────────────────────────────────

function initFurniture() {
  // Workstation footprints: desk (1.4 x 0.7) + chair behind it (~0.4 x 0.4)
  // Combined footprint roughly 1.4 x 1.3 centered at the workstation origin
  const workstations: [number, number, number][] = [
    [-6, -6, 0],
    [-4, -4.5, Math.PI / 4],
    [4, -6, 0],
    [6, -4.5, -Math.PI / 4],
    [4, 4.5, Math.PI],
    [6, 6, Math.PI],
    [-6, 4.5, Math.PI],
    [-4, 6, -Math.PI * 0.75],
  ];

  for (const [x, z, rot] of workstations) {
    const hw = 0.7;  // half-width of desk
    const hd = 0.65; // half-depth (desk + chair)
    if (Math.abs(rot % (Math.PI / 2)) < 0.1) {
      addObstacle(x, z, hw, hd);
    } else {
      addObstacleRotated(x, z, hw, hd, rot);
    }
  }

  // Plants (small circular obstacles)
  const plants: [number, number][] = [
    [-2, -2], [2, -2], [-2, 2], [2, 2],
    [0, -8], [0, 8], [-8, 0], [8, 0],
  ];
  for (const [x, z] of plants) {
    addObstacle(x, z, 0.15, 0.15);
  }
}

initFurniture();
